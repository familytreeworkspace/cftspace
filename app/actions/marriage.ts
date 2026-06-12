'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Marriage / maiden linking ────────────────────────────────────────────────
// A married woman links the two households she belongs to:
//   • WIFE (Zal) card     →  father_household_id   (her maika; head = her father)
//   • DAUGHTER (Beti) card →  married_household_id  (her sasural; head = her husband)
// Whatever one side sets, the same marriage is visible from the other side. Every
// display value (names, sub-caste, mother, village) is derived from the linked
// household at read time — nothing is copied, so corrections stay consistent.

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, ok: false as const }
  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  const ok = !!profile && ['chief', 'admin'].includes(profile.role)
  return { supabase, user, ok }
}

// Search households (heads) within a sub caste — head_name is the father/husband.
// head_father_name disambiguates two heads with the same name.
export async function searchHouseholdsForMarriage(
  query: string,
  subCasteId: string,
  excludeHouseholdId?: string,
) {
  const supabase = await createClient()
  let q = supabase
    .from('households')
    .select('id, ghar_number, head_name, head_name_sindhi, head_father_name, head_gender, dob_year, original_address, current_address, orig_village_city, curr_village_city')
    .eq('sub_caste_id', subCasteId)
    .eq('is_active', true)
    .order('ghar_number')
    .limit(25)

  const term = query.trim()
  if (term) q = q.or(`head_name.ilike.%${term}%,head_name_sindhi.ilike.%${term}%,head_father_name.ilike.%${term}%`)
  if (excludeHouseholdId) q = q.neq('id', excludeHouseholdId)

  const { data } = await q
  return data ?? []
}

// Wives (Zal members) of a household — used to choose which one is the mother
// when a father had more than one wife.
export async function getHouseholdWives(householdId: string) {
  const supabase = await createClient()
  const WIFE_CODES = ['زال', 'zal', 'wife', 'spouse', 'w']
  const { data } = await supabase
    .from('members')
    .select('id, name, name_sindhi, relation_code, sub_caste_id')
    .eq('household_id', householdId)
  return (data ?? []).filter(m =>
    WIFE_CODES.includes(m.relation_code) || WIFE_CODES.includes((m.relation_code ?? '').toLowerCase()),
  )
}

// Link a WIFE to her father's household (maika). Optional motherMemberId picks the
// correct mother when the father had multiple wives.
export async function setMaidenLink(input: {
  wifeMemberId: string
  fatherHouseholdId: string
  motherMemberId?: string | null
  householdId: string          // the wife's own household — for revalidation
}): Promise<{ error?: string }> {
  const { supabase, user, ok } = await requireAdmin()
  if (!user) return { error: 'Not authenticated' }
  if (!ok) return { error: 'Only Admin or Chief can link marriages.' }

  const { error } = await supabase
    .from('members')
    .update({
      father_household_id: input.fatherHouseholdId,
      mother_member_id:    input.motherMemberId ?? null,
      maiden_external:      false,
      maiden_father_name:   null,
      maiden_mother_name:   null,
      maiden_sub_caste:     null,
      maiden_address:       null,
    })
    .eq('id', input.wifeMemberId)
  if (error) return { error: error.message }

  await supabase.from('change_history').insert({
    table_name: 'members', record_id: input.wifeMemberId,
    field_name: 'father_household_id', old_value: null,
    new_value: input.fatherHouseholdId, changed_by: user.id,
  })

  revalidatePath('/tree')
  return {}
}

// Link a WIFE whose maika is OUTSIDE the platform — store free-text detail.
export async function setExternalMaiden(input: {
  wifeMemberId: string
  fatherName: string
  motherName?: string
  subCaste?: string
  address?: string
  householdId: string
}): Promise<{ error?: string }> {
  const { supabase, user, ok } = await requireAdmin()
  if (!user) return { error: 'Not authenticated' }
  if (!ok) return { error: 'Only Admin or Chief can link marriages.' }

  if (!input.fatherName.trim()) return { error: 'Father name is required.' }

  const { error } = await supabase
    .from('members')
    .update({
      father_household_id: null,
      mother_member_id:    null,
      maiden_external:     true,
      maiden_father_name:  input.fatherName.trim(),
      maiden_mother_name:  input.motherName?.trim() || null,
      maiden_sub_caste:    input.subCaste?.trim() || null,
      maiden_address:      input.address?.trim() || null,
    })
    .eq('id', input.wifeMemberId)
  if (error) return { error: error.message }

  await supabase.from('change_history').insert({
    table_name: 'members', record_id: input.wifeMemberId,
    field_name: 'maiden_external', old_value: null,
    new_value: input.fatherName.trim(), changed_by: user.id,
  })

  revalidatePath('/tree')
  return {}
}

// Link a DAUGHTER to her husband's household (sasural).
export async function setMarriedLink(input: {
  betiMemberId: string
  husbandHouseholdId: string
  householdId: string
}): Promise<{ error?: string }> {
  const { supabase, user, ok } = await requireAdmin()
  if (!user) return { error: 'Not authenticated' }
  if (!ok) return { error: 'Only Admin or Chief can link marriages.' }

  const { error } = await supabase
    .from('members')
    .update({ married_household_id: input.husbandHouseholdId })
    .eq('id', input.betiMemberId)
  if (error) return { error: error.message }

  await supabase.from('change_history').insert({
    table_name: 'members', record_id: input.betiMemberId,
    field_name: 'married_household_id', old_value: null,
    new_value: input.husbandHouseholdId, changed_by: user.id,
  })

  revalidatePath('/tree')
  return {}
}

// Clear a marriage link (maika or sasural).
export async function clearMarriageLink(
  memberId: string,
  kind: 'maiden' | 'married',
): Promise<{ error?: string }> {
  const { supabase, user, ok } = await requireAdmin()
  if (!user) return { error: 'Not authenticated' }
  if (!ok) return { error: 'Only Admin or Chief can edit marriages.' }

  const patch = kind === 'maiden'
    ? {
        father_household_id: null, mother_member_id: null, maiden_external: false,
        maiden_father_name: null, maiden_mother_name: null,
        maiden_sub_caste: null, maiden_address: null,
      }
    : { married_household_id: null }

  const { error } = await supabase.from('members').update(patch).eq('id', memberId)
  if (error) return { error: error.message }

  revalidatePath('/tree')
  return {}
}

// ── Viewer read helpers ──────────────────────────────────────────────────────

const WIFE_CODES = ['زال', 'zal', 'wife', 'spouse', 'w']
const isWifeCode = (c: string) => WIFE_CODES.includes(c) || WIFE_CODES.includes((c ?? '').toLowerCase())

export interface MaidenInfo {
  external: boolean
  fatherName: string | null
  fatherSubCaste: string | null
  motherName: string | null
  motherSubCaste: string | null
  village: string | null
  gharNumber: string | null
  householdId: string | null
}

// Parent (maika) details for a WIFE card.
export async function getMaidenInfo(memberId: string): Promise<MaidenInfo | null> {
  const supabase = await createClient()
  const { data: member } = await supabase
    .from('members')
    .select('father_household_id, mother_member_id, maiden_external, maiden_father_name, maiden_mother_name, maiden_sub_caste, maiden_address')
    .eq('id', memberId)
    .single()
  if (!member) return null

  if (member.maiden_external) {
    return {
      external: true,
      fatherName:     member.maiden_father_name,
      fatherSubCaste: member.maiden_sub_caste,
      motherName:     member.maiden_mother_name,
      motherSubCaste: null,
      village:        member.maiden_address,
      gharNumber:     null,
      householdId:    null,
    }
  }

  if (!member.father_household_id) return null

  const { data: hh } = await supabase
    .from('households')
    .select('id, ghar_number, head_name, head_name_sindhi, original_address, orig_village_city, sub_caste_id, sub_castes(name)')
    .eq('id', member.father_household_id)
    .single() as { data: any }
  if (!hh) return null

  // Mother: the chosen wife, else the (only) wife of the father's household
  let motherName: string | null = null
  let motherSubCasteId: string | null = null
  if (member.mother_member_id) {
    const { data: mom } = await supabase
      .from('members').select('name, name_sindhi, sub_caste_id')
      .eq('id', member.mother_member_id).single() as { data: any }
    if (mom) { motherName = mom.name || mom.name_sindhi; motherSubCasteId = mom.sub_caste_id }
  } else {
    const { data: members } = await supabase
      .from('members').select('name, name_sindhi, relation_code, sub_caste_id')
      .eq('household_id', member.father_household_id) as { data: any[] | null }
    const wife = (members ?? []).find(m => isWifeCode(m.relation_code))
    if (wife) { motherName = wife.name || wife.name_sindhi; motherSubCasteId = wife.sub_caste_id }
  }

  let motherSubCaste: string | null = null
  if (motherSubCasteId) {
    const { data: sc } = await supabase.from('sub_castes').select('name').eq('id', motherSubCasteId).single() as { data: any }
    motherSubCaste = sc?.name ?? null
  }

  return {
    external: false,
    fatherName:     hh.head_name || hh.head_name_sindhi,
    fatherSubCaste: hh.sub_castes?.name ?? null,
    motherName,
    motherSubCaste,
    village:        hh.orig_village_city || hh.original_address,
    gharNumber:     hh.ghar_number,
    householdId:    hh.id,
  }
}

export interface MarriedInfo {
  husbandName: string | null
  husbandFatherName: string | null
  husbandMotherName: string | null
  subCaste: string | null
  village: string | null
  gharNumber: string | null
  householdId: string | null
}

// In-law (sasural) details for a DAUGHTER card.
export async function getMarriedInfo(memberId: string): Promise<MarriedInfo | null> {
  const supabase = await createClient()
  const { data: member } = await supabase
    .from('members').select('married_household_id').eq('id', memberId).single()
  if (!member?.married_household_id) return null

  const { data: hh } = await supabase
    .from('households')
    .select('id, ghar_number, head_name, head_name_sindhi, head_father_name, current_address, curr_village_city, sub_caste_id, sub_castes(name)')
    .eq('id', member.married_household_id)
    .single() as { data: any }
  if (!hh) return null

  // Husband's mother = wife of the husband's father's household (if that link exists)
  let husbandMotherName: string | null = null
  const { data: parentLink } = await (supabase as any)
    .from('household_links')
    .select('parent_household_id')
    .eq('child_household_id', hh.id)
    .neq('relation', 'spouse')
    .maybeSingle()
  if (parentLink?.parent_household_id) {
    const { data: members } = await supabase
      .from('members').select('name, name_sindhi, relation_code')
      .eq('household_id', parentLink.parent_household_id) as { data: any[] | null }
    const wife = (members ?? []).find(m => isWifeCode(m.relation_code))
    if (wife) husbandMotherName = wife.name || wife.name_sindhi
  }

  return {
    husbandName:       hh.head_name || hh.head_name_sindhi,
    husbandFatherName: hh.head_father_name,
    husbandMotherName,
    subCaste:          hh.sub_castes?.name ?? null,
    village:           hh.curr_village_city || hh.current_address,
    gharNumber:        hh.ghar_number,
    householdId:       hh.id,
  }
}
