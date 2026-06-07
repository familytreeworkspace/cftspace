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

// Get ALL tree data for every household in a sub caste (4 DB calls total)
export async function getSubCasteTreeData(subCasteId: string) {
  const supabase = await createClient()

  // Cast as any — head_father_name and is_virtual added by migrations 006/007
  const { data: householdsRaw } = await supabase
    .from('households')
    .select('id, ghar_number, head_name, head_gender, dob_year, sub_caste_id, photo_url, head_father_name, is_virtual')
    .eq('sub_caste_id', subCasteId)
    .eq('is_active', true)
    .order('ghar_number') as { data: any[] | null }

  const households = householdsRaw ?? []
  if (!households.length) return { trees: [], crossLinks: [] }

  const householdIds = households.map((h: any) => h.id as string)

  const { data: allMembers } = await supabase
    .from('members')
    .select('id, name, gender, relation_code, dob_year, photo_url, sub_caste_id, household_id')
    .in('household_id', householdIds)
    .order('member_number')

  const allMemberIds = [...householdIds, ...(allMembers ?? []).map(m => m.id)]
  const { data: allLinks } = await supabase
    .from('family_links')
    .select('id, member_id, father_id, mother_id, spouse_id, link_type')
    .in('member_id', allMemberIds)

  // Cross-household links (table added by migration 007, cast as any)
  const { data: crossLinksData } = await (supabase as any)
    .from('household_links')
    .select('id, child_household_id, parent_household_id, relation, link_type')
    .in('child_household_id', householdIds)

  const trees = households.map((h: any) => {
    const members = (allMembers ?? []).filter(m => m.household_id === h.id)
    const hMemberIds = new Set([h.id, ...members.map(m => m.id)])
    const links = (allLinks ?? []).filter(l => hMemberIds.has(l.member_id))
    return { household: h, members, links }
  })

  return { trees, crossLinks: crossLinksData ?? [] }
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
      relation_code: 'father',
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
