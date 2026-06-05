'use server'

import { createClient } from '@/lib/supabase/server'

// ---- Sub Caste Wise ----
export async function getSubCasteReport(subCasteId: string) {
  const supabase = await createClient()

  const { data: households } = await supabase
    .from('households')
    .select(`
      id, ghar_number, head_name, head_gender, dob_year,
      education, profession, original_address, current_address,
      members(count)
    `)
    .eq('sub_caste_id', subCasteId)
    .eq('is_active', true)
    .order('ghar_number')

  return (households ?? []).map(h => ({
    ...h,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    member_count: (h.members as any)?.[0]?.count ?? 0,
  }))
}

// ---- Family Wise ----
export async function getFamilyReport(householdId: string) {
  const supabase = await createClient()

  const { data: household } = await supabase
    .from('households')
    .select(`
      id, ghar_number, head_name, head_gender, dob_year,
      education, profession, original_address, current_address,
      sub_castes(name)
    `)
    .eq('id', householdId)
    .single()

  const { data: members } = await supabase
    .from('members')
    .select('id, member_number, name, gender, relation_code, dob_year, education, profession, sub_castes(name)')
    .eq('household_id', householdId)
    .order('member_number')

  const { data: contacts } = await supabase
    .from('contacts')
    .select('contact_number, contact_type')
    .eq('household_id', householdId)
    .order('display_order')

  return { household, members: members ?? [], contacts: contacts ?? [] }
}

// ---- Age Wise ----
export async function getAgeReport(
  minAge: number | null,
  maxAge: number | null,
  subCasteId?: string
) {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()

  let query = supabase
    .from('members')
    .select(`
      id, name, gender, relation_code, dob_year,
      household_id, sub_caste_id,
      households(ghar_number, head_name, sub_caste_id),
      sub_castes(name)
    `)
    .not('dob_year', 'is', null)
    .order('dob_year')

  if (subCasteId) query = query.eq('sub_caste_id', subCasteId)

  const { data } = await query

  const filtered = (data ?? []).filter(m => {
    if (!m.dob_year) return false
    const age = currentYear - m.dob_year
    if (minAge !== null && age < minAge) return false
    if (maxAge !== null && age > maxAge) return false
    return true
  })

  return filtered.map(m => ({
    ...m,
    age: m.dob_year ? currentYear - m.dob_year : null,
  }))
}

// ---- Profession Wise ----
export async function getProfessionReport(profession: string, subCasteId?: string) {
  const supabase = await createClient()

  // Check both households and members
  const [{ data: headMatches }, { data: memberMatches }] = await Promise.all([
    supabase
      .from('households')
      .select('id, ghar_number, head_name, head_gender, dob_year, profession, sub_caste_id, sub_castes(name)')
      .ilike('profession', `%${profession}%`)
      .eq('is_active', true),
    supabase
      .from('members')
      .select('id, name, gender, relation_code, dob_year, profession, household_id, sub_caste_id, households(ghar_number, head_name), sub_castes(name)')
      .ilike('profession', `%${profession}%`),
  ])

  const heads = (headMatches ?? [])
    .filter(h => !subCasteId || h.sub_caste_id === subCasteId)
    .map(h => ({
      id: h.id,
      name: h.head_name,
      gender: h.head_gender,
      relation_code: 'HEAD',
      dob_year: h.dob_year,
      profession: h.profession,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ghar_number: h.ghar_number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sub_caste_name: (h.sub_castes as any)?.name ?? '—',
    }))

  const members = (memberMatches ?? [])
    .filter(m => !subCasteId || m.sub_caste_id === subCasteId)
    .map(m => ({
      id: m.id,
      name: m.name,
      gender: m.gender,
      relation_code: m.relation_code,
      dob_year: m.dob_year,
      profession: m.profession,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ghar_number: (m.households as any)?.ghar_number ?? '—',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sub_caste_name: (m.sub_castes as any)?.name ?? '—',
    }))

  return [...heads, ...members]
}

// ---- Education Wise ----
export async function getEducationReport(education: string, subCasteId?: string) {
  const supabase = await createClient()

  const [{ data: headMatches }, { data: memberMatches }] = await Promise.all([
    supabase
      .from('households')
      .select('id, ghar_number, head_name, head_gender, dob_year, education, sub_caste_id, sub_castes(name)')
      .ilike('education', `%${education}%`)
      .eq('is_active', true),
    supabase
      .from('members')
      .select('id, name, gender, relation_code, dob_year, education, household_id, sub_caste_id, households(ghar_number, head_name), sub_castes(name)')
      .ilike('education', `%${education}%`),
  ])

  const heads = (headMatches ?? [])
    .filter(h => !subCasteId || h.sub_caste_id === subCasteId)
    .map(h => ({
      id: h.id, name: h.head_name, gender: h.head_gender,
      relation_code: 'HEAD', dob_year: h.dob_year, education: h.education,
      ghar_number: h.ghar_number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sub_caste_name: (h.sub_castes as any)?.name ?? '—',
    }))

  const members = (memberMatches ?? [])
    .filter(m => !subCasteId || m.sub_caste_id === subCasteId)
    .map(m => ({
      id: m.id, name: m.name, gender: m.gender,
      relation_code: m.relation_code, dob_year: m.dob_year, education: m.education,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ghar_number: (m.households as any)?.ghar_number ?? '—',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sub_caste_name: (m.sub_castes as any)?.name ?? '—',
    }))

  return [...heads, ...members]
}

// ---- Village Wise ----
export async function getVillageReport(villageQuery: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('households')
    .select(`
      id, ghar_number, head_name, head_gender, dob_year,
      education, profession, original_address, current_address,
      sub_caste_id, sub_castes(name),
      members(count)
    `)
    .or(`original_address.ilike.%${villageQuery}%,current_address.ilike.%${villageQuery}%`)
    .eq('is_active', true)
    .order('ghar_number')

  return (data ?? []).map(h => ({
    ...h,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub_caste_name: (h.sub_castes as any)?.name ?? '—',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    member_count: (h.members as any)?.[0]?.count ?? 0,
  }))
}

// ---- Village Wise Married Household ----
// Households where a wife member's sub_caste matches village's community
export async function getVillageMarriedReport(villageQuery: string) {
  const supabase = await createClient()

  // Find households with wives whose original address matches village
  const { data: wives } = await supabase
    .from('members')
    .select(`
      id, name, dob_year,
      household_id,
      households(
        id, ghar_number, head_name, original_address, current_address,
        sub_castes(name)
      )
    `)
    .eq('relation_code', 'زال')  // wife relation code

  const filtered = (wives ?? []).filter(w => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = w.households as any
    return (
      h?.original_address?.toLowerCase().includes(villageQuery.toLowerCase()) ||
      h?.current_address?.toLowerCase().includes(villageQuery.toLowerCase())
    )
  })

  return filtered.map(w => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = w.households as any
    return {
      wife_name: w.name,
      wife_dob_year: w.dob_year,
      ghar_number: h?.ghar_number ?? '—',
      head_name: h?.head_name ?? '—',
      original_address: h?.original_address ?? '—',
      sub_caste_name: h?.sub_castes?.name ?? '—',
    }
  })
}
