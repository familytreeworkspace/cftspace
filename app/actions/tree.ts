'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type LinkType = 'biological' | 'step' | 'adopted'

// Link two members (parent → child or spouse → spouse)
export async function linkMembers(
  memberId: string,
  linkKind: 'father' | 'mother' | 'spouse',
  targetId: string,
  householdId: string,
  linkType: LinkType = 'biological'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can link members.' }
  }

  // Get existing link row for this member
  const { data: existing } = await supabase
    .from('family_links')
    .select('id, father_id, mother_id, spouse_id')
    .eq('member_id', memberId)
    .maybeSingle()

  if (linkKind === 'spouse') {
    // Upsert spouse link (bidirectional)
    if (existing) {
      await supabase.from('family_links')
        .update({ spouse_id: targetId })
        .eq('id', existing.id)
    } else {
      await supabase.from('family_links').insert({
        member_id: memberId,
        spouse_id: targetId,
        link_type: linkType,
        created_by: user.id,
      })
    }
    // Also link in reverse
    const { data: reverseExisting } = await supabase
      .from('family_links')
      .select('id')
      .eq('member_id', targetId)
      .maybeSingle()

    if (reverseExisting) {
      await supabase.from('family_links')
        .update({ spouse_id: memberId })
        .eq('id', reverseExisting.id)
    } else {
      await supabase.from('family_links').insert({
        member_id: targetId,
        spouse_id: memberId,
        link_type: linkType,
        created_by: user.id,
      })
    }
  } else {
    const patch = linkKind === 'father'
      ? { father_id: targetId }
      : { mother_id: targetId }

    if (existing) {
      await supabase.from('family_links')
        .update(patch)
        .eq('id', existing.id)
    } else {
      await supabase.from('family_links').insert({
        member_id: memberId,
        link_type: linkType,
        created_by: user.id,
        ...patch,
      })
    }
  }

  // Log to change_history
  await supabase.from('change_history').insert({
    table_name: 'family_links',
    record_id:  memberId,
    field_name: linkKind + '_id',
    old_value:  null,
    new_value:  targetId,
    changed_by: user.id,
  })

  revalidatePath(`/tree/${householdId}`)
  return {}
}

// Remove a specific link
export async function unlinkMembers(
  memberId: string,
  linkKind: 'father' | 'mother' | 'spouse',
  householdId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can unlink members.' }
  }

  const { data: existing } = await supabase
    .from('family_links')
    .select('id, spouse_id')
    .eq('member_id', memberId)
    .maybeSingle()

  if (!existing) return {}

  if (linkKind === 'spouse' && existing.spouse_id) {
    // Remove reverse link too
    await supabase.from('family_links')
      .update({ spouse_id: null })
      .eq('member_id', existing.spouse_id)
  }

  const clearPatch = linkKind === 'father' ? { father_id: null }
    : linkKind === 'mother' ? { mother_id: null }
    : { spouse_id: null }

  await supabase.from('family_links')
    .update(clearPatch)
    .eq('id', existing.id)

  await supabase.from('change_history').insert({
    table_name: 'family_links',
    record_id:  memberId,
    field_name: linkKind + '_id',
    old_value:  'linked',
    new_value:  null,
    changed_by: user.id,
  })

  revalidatePath(`/tree/${householdId}`)
  return {}
}

// Sindhi/English codes that identify an in-household ancestor member
const ANCESTOR_FATHER = ['father', 'dad', 'abu', 'aabu', 'پيءُ', 'پيءَ', 'باپ', 'پيو']
const ANCESTOR_MOTHER = ['ماءُ', 'ماء', 'maa', 'mother', 'mom', 'ماءَ']

// One-time cleanup: convert legacy in-household father/mother MEMBERS into proper
// virtual ancestor HOUSEHOLDS (so they can act as a real parent for sibling linking).
// Idempotent — after the first run there are no such members left, so it no-ops.
async function migrateInHouseholdAncestors(subCasteId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) return

  const { data: hhs } = await supabase
    .from('households').select('id').eq('sub_caste_id', subCasteId).eq('is_active', true)
  if (!hhs?.length) return
  const hhIds = hhs.map((h: any) => h.id as string)

  const { data: members } = await supabase
    .from('members')
    .select('id, name, gender, relation_code, dob_year, household_id, sub_caste_id')
    .in('household_id', hhIds)

  const isCode = (code: string, set: string[]) =>
    set.includes(code) || set.includes((code ?? '').toLowerCase())

  const ancestors = (members ?? []).filter(
    m => isCode(m.relation_code ?? '', ANCESTOR_FATHER) || isCode(m.relation_code ?? '', ANCESTOR_MOTHER)
  )
  if (!ancestors.length) return

  let i = 0
  for (const m of ancestors) {
    const isMother = isCode(m.relation_code ?? '', ANCESTOR_MOTHER)
    const { data: vh, error: vhErr } = await (supabase as any)
      .from('households')
      .insert({
        sub_caste_id: m.sub_caste_id ?? subCasteId,
        ghar_number:  `ANC-${Date.now()}-${i++}`,
        head_name:    m.name,
        head_gender:  m.gender,
        dob_year:     m.dob_year,
        is_virtual:   true,
        is_active:    true,
      })
      .select('id')
      .single()
    if (vhErr || !vh) continue

    const { error: linkErr } = await (supabase as any)
      .from('household_links')
      .insert({
        child_household_id:  m.household_id,
        parent_household_id: vh.id,
        relation:            isMother ? 'mother' : 'father',
        link_type:           'biological',
        created_by:          user.id,
      })
    if (linkErr) { await supabase.from('households').delete().eq('id', vh.id); continue }

    await supabase.from('members').delete().eq('id', m.id)
  }
}

// Get ALL tree data for every household in a sub caste (4 DB calls total)
export async function getSubCasteTreeData(subCasteId: string) {
  // Clean up any legacy in-household ancestor members before building the tree (never block the load)
  try { await migrateInHouseholdAncestors(subCasteId) } catch {}

  const supabase = await createClient()

  // death_year is added by migration 009 — fall back gracefully if it isn't applied yet
  const hhCols = (death: boolean) =>
    `id, ghar_number, head_name, head_name_sindhi, head_gender, dob_year, ${death ? 'death_year, ' : ''}sub_caste_id, photo_url, head_father_name, is_virtual`

  let { data: householdsRaw, error: hhErr } = await supabase
    .from('households').select(hhCols(true))
    .eq('sub_caste_id', subCasteId).eq('is_active', true)
    .order('ghar_number') as { data: any[] | null; error: any }
  if (hhErr) {
    ({ data: householdsRaw } = await supabase
      .from('households').select(hhCols(false))
      .eq('sub_caste_id', subCasteId).eq('is_active', true)
      .order('ghar_number') as { data: any[] | null; error: any })
  }

  const households = householdsRaw ?? []
  if (!households.length) return { trees: [], crossLinks: [] }

  const householdIds = households.map((h: any) => h.id as string)

  const mCols = (death: boolean) =>
    `id, name, name_sindhi, gender, relation_code, dob_year, ${death ? 'death_year, ' : ''}photo_url, sub_caste_id, household_id`

  let { data: allMembers, error: mErr } = await supabase
    .from('members').select(mCols(true))
    .in('household_id', householdIds)
    .order('member_number') as { data: any[] | null; error: any }
  if (mErr) {
    ({ data: allMembers } = await supabase
      .from('members').select(mCols(false))
      .in('household_id', householdIds)
      .order('member_number') as { data: any[] | null; error: any })
  }

  const allMemberIds = [...householdIds, ...(allMembers ?? []).map(m => m.id)]
  const { data: allLinks } = await supabase
    .from('family_links')
    .select('id, member_id, father_id, mother_id, spouse_id, link_type')
    .in('member_id', allMemberIds)

  // Marriage / maiden link fields (columns added by migration 014 — ignore if not applied yet)
  const { data: marriageRows } = await (supabase as any)
    .from('members')
    .select('id, father_household_id, mother_member_id, married_household_id, maiden_external')
    .in('household_id', householdIds)
  const marriageMap = new Map<string, any>((marriageRows ?? []).map((r: any) => [r.id, r]))

  // Cross-household links (table added by migration 007, cast as any)
  const { data: crossLinksData } = await (supabase as any)
    .from('household_links')
    .select('id, child_household_id, parent_household_id, relation, link_type')
    .in('child_household_id', householdIds)

  // Saved manual card positions (table added by migration 010 — ignore if not applied yet)
  const { data: positionsData } = await (supabase as any)
    .from('tree_positions')
    .select('node_id, x, y')
    .eq('sub_caste_id', subCasteId)

  const trees = households.map((h: any) => {
    const members = (allMembers ?? [])
      .filter(m => m.household_id === h.id)
      .map(m => ({ ...m, ...(marriageMap.get(m.id) ?? {}) }))
    const hMemberIds = new Set([h.id, ...members.map(m => m.id)])
    const links = (allLinks ?? []).filter(l => hMemberIds.has(l.member_id))
    return { household: h, members, links }
  })

  return { trees, crossLinks: crossLinksData ?? [], positions: positionsData ?? [] }
}

// Save (upsert) a card's manual position
export async function saveNodePosition(
  subCasteId: string, nodeId: string, x: number, y: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can move cards.' }
  }

  const { error } = await (supabase as any)
    .from('tree_positions')
    .upsert(
      { sub_caste_id: subCasteId, node_id: nodeId, x, y, updated_at: new Date().toISOString() },
      { onConflict: 'sub_caste_id,node_id' },
    )
  if (error) return { error: error.message }
  return {}
}

// Clear all saved positions for a sub caste (back to automatic layout)
export async function resetTreeLayout(subCasteId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can reset the layout.' }
  }

  const { error } = await (supabase as any)
    .from('tree_positions').delete().eq('sub_caste_id', subCasteId)
  if (error) return { error: error.message }
  return {}
}

// Add father/ancestor as a member inside the SAME household (shows in same blue box)
export async function addAncestorMember(input: {
  householdId: string
  name: string
  gender: string
  dobYear: number | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can add ancestors.' }
  }

  const { data: lastMember } = await supabase
    .from('members')
    .select('member_number')
    .eq('household_id', input.householdId)
    .order('member_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: hh } = await supabase
    .from('households')
    .select('sub_caste_id')
    .eq('id', input.householdId)
    .single()

  const { error } = await supabase
    .from('members')
    .insert({
      household_id:  input.householdId,
      member_number: ((lastMember?.member_number ?? 0) as number) + 1,
      name:          input.name,
      gender:        input.gender as 'Male' | 'Female',
      relation_code: input.gender === 'Female' ? 'mother' : 'father',
      dob_year:      input.dobYear,
      sub_caste_id:  hh?.sub_caste_id,
    })

  if (error) return { error: error.message }

  revalidatePath('/tree')
  return {}
}

// Create a virtual ancestor household and link it to a child household
export async function createVirtualAncestor(input: {
  name: string
  gender: string
  dobYear: number | null
  subCasteId: string
  childHouseholdId: string
  relation: 'father' | 'mother'
}): Promise<{ error?: string; householdId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can add ancestors.' }
  }

  // Cast as any — is_virtual added by migration 007, household_links is new table
  const { data: vh, error: vhErr } = await (supabase as any)
    .from('households')
    .insert({
      sub_caste_id: input.subCasteId,
      ghar_number:  `ANC-${Date.now()}`,
      head_name:    input.name,
      head_gender:  input.gender as 'Male' | 'Female',
      dob_year:     input.dobYear,
      is_virtual:   true,
      is_active:    true,
    })
    .select('id')
    .single()

  if (vhErr || !vh) return { error: vhErr?.message ?? 'Failed to create ancestor' }

  const { error: linkErr } = await (supabase as any)
    .from('household_links')
    .insert({
      child_household_id:  input.childHouseholdId,
      parent_household_id: vh.id,
      relation:            input.relation,
      link_type:           'biological',
      created_by:          user.id,
    })

  if (linkErr) {
    await supabase.from('households').delete().eq('id', vh.id)
    return { error: linkErr.message }
  }

  revalidatePath('/tree')
  return { householdId: vh.id }
}

// Mark a person deceased (or clear it) by setting the death year
export async function setDeathYear(
  id: string,
  target: 'household' | 'member',
  year: number | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can update this.' }
  }

  const table = target === 'household' ? 'households' : 'members'
  const { error } = await (supabase as any).from(table).update({ death_year: year }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/tree')
  return {}
}

// Remove the parent link of a child household (undo a cross-household link)
export async function removeHouseholdLink(childHouseholdId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can unlink households.' }
  }

  const { error } = await (supabase as any)
    .from('household_links')
    .delete()
    .eq('child_household_id', childHouseholdId)

  if (error) return { error: error.message }

  revalidatePath('/tree')
  return {}
}

// Create a cross-household link between two existing households
export async function createHouseholdLink(input: {
  childHouseholdId: string
  parentHouseholdId: string
  relation: 'father' | 'mother' | 'spouse'
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can link households.' }
  }

  const { error } = await (supabase as any)
    .from('household_links')
    .upsert(
      {
        child_household_id:  input.childHouseholdId,
        parent_household_id: input.parentHouseholdId,
        relation:            input.relation,
        link_type:           'biological',
        created_by:          user.id,
      },
      { onConflict: 'child_household_id,parent_household_id,relation' }
    )

  if (error) return { error: error.message }

  revalidatePath('/tree')
  return {}
}

// ── Auto-link families by father name ──────────────────────────────────────
// Connects the 88 separate household trees into proper lineages: matches each
// household's imported father name (head_father_name[_sindhi]) to the head of
// another household in the same sub caste and creates the parent→child
// household_link. When a father is shared by several households but is NOT a
// household himself, a single virtual ancestor is created so those siblings
// hang together under one father node. Idempotent — re-running only fills gaps.
export interface AutoLinkResult {
  linkedToReal: number       // households linked to an existing parent household
  groupedUnderVirtual: number // households grouped under a new virtual father
  ancestorsCreated: number   // virtual father households created
  ambiguous: number          // father name matched >1 household — left for manual linking
  alreadyLinked: number      // skipped because a parent link already existed
  noFather: number           // skipped because no father name was recorded
  error?: string
}

// Normalise a name for matching: trim, collapse inner whitespace, lower-case.
function normName(s?: string | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}

export async function autoLinkHouseholds(subCasteId: string): Promise<AutoLinkResult> {
  const empty: AutoLinkResult = {
    linkedToReal: 0, groupedUnderVirtual: 0, ancestorsCreated: 0,
    ambiguous: 0, alreadyLinked: 0, noFather: 0,
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...empty, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { ...empty, error: 'Only Admin or Chief can auto-link families.' }
  }

  // Load every active household in this sub caste (cast as any — *_sindhi / is_virtual
  // columns are added by later migrations).
  const { data: hhRaw, error: hhErr } = await (supabase as any)
    .from('households')
    .select('id, head_name, head_name_sindhi, head_father_name, head_father_name_sindhi, is_virtual')
    .eq('sub_caste_id', subCasteId)
    .eq('is_active', true)
  if (hhErr) return { ...empty, error: hhErr.message }

  const households = (hhRaw ?? []) as Array<{
    id: string
    head_name: string | null
    head_name_sindhi: string | null
    head_father_name: string | null
    head_father_name_sindhi: string | null
    is_virtual: boolean | null
  }>
  if (households.length === 0) return empty

  // Index real (non-virtual) households by every spelling of their head name.
  const headIndex = new Map<string, string[]>()  // normName → [householdId]
  for (const h of households) {
    if (h.is_virtual) continue
    for (const n of [normName(h.head_name), normName(h.head_name_sindhi)]) {
      if (!n) continue
      const arr = headIndex.get(n) ?? []
      if (!arr.includes(h.id)) arr.push(h.id)
      headIndex.set(n, arr)
    }
  }

  // Households that already have a parent (father/mother) link — never touch these.
  const { data: existingLinks } = await (supabase as any)
    .from('household_links')
    .select('child_household_id, relation')
  const linkedChildren = new Set<string>(
    (existingLinks ?? [])
      .filter((l: any) => l.relation !== 'spouse')
      .map((l: any) => l.child_household_id)
  )

  const result: AutoLinkResult = { ...empty }
  const toRealLinks: { child: string; parent: string }[] = []
  const orphans = new Map<string, { name: string; children: string[] }>() // fatherKey → siblings

  for (const h of households) {
    if (h.is_virtual) continue
    if (linkedChildren.has(h.id)) { result.alreadyLinked++; continue }

    const fatherDisplay = (h.head_father_name_sindhi || h.head_father_name || '').trim()
    const fatherKey = normName(fatherDisplay)
    if (!fatherKey) { result.noFather++; continue }

    const matches = (headIndex.get(fatherKey) ?? []).filter(id => id !== h.id)
    if (matches.length === 1) {
      toRealLinks.push({ child: h.id, parent: matches[0] })
    } else if (matches.length > 1) {
      result.ambiguous++   // can't tell which same-named head is the father — leave manual
    } else {
      const o = orphans.get(fatherKey) ?? { name: fatherDisplay, children: [] }
      o.children.push(h.id)
      orphans.set(fatherKey, o)
    }
  }

  // Create the parent→child links to real households.
  for (const { child, parent } of toRealLinks) {
    const { error } = await (supabase as any)
      .from('household_links')
      .upsert(
        { child_household_id: child, parent_household_id: parent, relation: 'father', link_type: 'biological', created_by: user.id },
        { onConflict: 'child_household_id,parent_household_id,relation' },
      )
    if (!error) result.linkedToReal++
  }

  // For fathers shared by 2+ households but not households themselves, create one
  // virtual ancestor each and hang the siblings under it.
  let vi = 0
  for (const { name, children } of orphans.values()) {
    if (children.length < 2) continue   // a lone household with an unknown father isn't a connection
    const { data: vh, error: vhErr } = await (supabase as any)
      .from('households')
      .insert({
        sub_caste_id: subCasteId,
        ghar_number:  `ANC-${Date.now()}-${vi++}`,
        head_name_sindhi: name,
        head_name:    name,
        head_gender:  'Male',
        is_virtual:   true,
        is_active:    true,
      })
      .select('id')
      .single()
    if (vhErr || !vh) continue
    result.ancestorsCreated++

    for (const child of children) {
      const { error } = await (supabase as any)
        .from('household_links')
        .upsert(
          { child_household_id: child, parent_household_id: vh.id, relation: 'father', link_type: 'biological', created_by: user.id },
          { onConflict: 'child_household_id,parent_household_id,relation' },
        )
      if (!error) result.groupedUnderVirtual++
    }
  }

  revalidatePath('/tree')
  return result
}

// ── Quick inline edit of a card's basics from the tree ──────────────────────
export async function updateCardBasics(input: {
  id: string
  target: 'household' | 'member'
  name: string
  gender: 'Male' | 'Female'
  dobYear: number | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can edit cards.' }
  }

  const name = input.name.trim()
  if (!name) return { error: 'Name cannot be empty.' }

  // Write the typed name to BOTH the English and Sindhi name columns so the card
  // (which shows English first, then Sindhi) reflects the correction immediately.
  const patch = input.target === 'household'
    ? { head_name: name, head_name_sindhi: name, head_gender: input.gender, dob_year: input.dobYear }
    : { name, name_sindhi: name, gender: input.gender, dob_year: input.dobYear }

  const table = input.target === 'household' ? 'households' : 'members'
  const { error } = await (supabase as any).from(table).update(patch).eq('id', input.id)
  if (error) return { error: error.message }

  revalidatePath('/tree')
  return {}
}

// ── Delete a card from the tree ─────────────────────────────────────────────
// member  → hard delete (and its family_links)
// household → soft delete (is_active=false) and drop any cross-household links
export async function deleteCard(input: {
  id: string
  target: 'household' | 'member'
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can delete cards.' }
  }

  if (input.target === 'member') {
    await supabase.from('family_links').delete().eq('member_id', input.id)
    const { error } = await supabase.from('members').delete().eq('id', input.id)
    if (error) return { error: error.message }
  } else {
    // Drop cross-household links where this household is child or parent, then soft-delete it.
    await (supabase as any).from('household_links').delete().eq('child_household_id', input.id)
    await (supabase as any).from('household_links').delete().eq('parent_household_id', input.id)
    const { error } = await supabase.from('households').update({ is_active: false }).eq('id', input.id)
    if (error) return { error: error.message }
  }

  revalidatePath('/tree')
  return {}
}

// Get full tree data for a single household
export async function getHouseholdTreeData(householdId: string) {
  const supabase = await createClient()

  const { data: household } = await supabase
    .from('households')
    .select('id, ghar_number, head_name, head_gender, dob_year, sub_caste_id, photo_url')
    .eq('id', householdId)
    .single()

  if (!household) return null

  const { data: members } = await supabase
    .from('members')
    .select('id, name, gender, relation_code, dob_year, photo_url, sub_caste_id, household_id')
    .eq('household_id', householdId)
    .order('member_number')

  const memberIds = [household.id, ...(members ?? []).map(m => m.id)]
  const { data: links } = await supabase
    .from('family_links')
    .select('id, member_id, father_id, mother_id, spouse_id, link_type')
    .in('member_id', memberIds)

  return { household, members: members ?? [], links: links ?? [] }
}

// Search members across households for linking
export async function searchMembersForLink(query: string, excludeId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('members')
    .select('id, name, gender, relation_code, dob_year, household_id, households(ghar_number, sub_castes(name))')
    .ilike('name', `%${query}%`)
    .neq('id', excludeId)
    .limit(20)

  return data ?? []
}
