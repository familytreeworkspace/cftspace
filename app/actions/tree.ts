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

// Get ALL tree data for every household in a sub caste (3 DB calls total)
export async function getSubCasteTreeData(subCasteId: string) {
  const supabase = await createClient()

  const { data: households } = await supabase
    .from('households')
    .select('id, ghar_number, head_name, head_gender, dob_year, sub_caste_id, photo_url')
    .eq('sub_caste_id', subCasteId)
    .eq('is_active', true)
    .order('ghar_number')

  if (!households?.length) return []

  const householdIds = households.map(h => h.id)

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

  return households.map(h => {
    const members = (allMembers ?? []).filter(m => m.household_id === h.id)
    const hMemberIds = new Set([h.id, ...members.map(m => m.id)])
    const links = (allLinks ?? []).filter(l => hMemberIds.has(l.member_id))
    return { household: h, members, links }
  })
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
