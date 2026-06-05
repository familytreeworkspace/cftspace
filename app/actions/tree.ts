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
