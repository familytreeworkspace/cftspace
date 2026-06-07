'use server'

import { createClient } from '@/lib/supabase/server'
import type { ImportType } from '@/lib/import-column-maps'
import { batchInsertIntoDirectory } from '@/app/actions/directory'

// ---- Types ----
export interface HouseholdRow {
  ghar_number: string
  head_name: string
  head_father_name?: string
  head_gender?: string
  dob_year?: number | null
  education?: string
  profession?: string
  original_address?: string
  orig_village_city?: string
  orig_district?: string
  orig_country?: string
  current_address?: string
  curr_village_city?: string
  curr_district?: string
  curr_country?: string
}

export interface MemberRow {
  ghar_number: string
  member_number?: number | null
  name: string
  gender?: string
  relation_code: string
  dob_year?: number | null
  education?: string
  profession?: string
  sub_caste?: string
}

export interface SashanRow {
  ghar_number: string
  khud_sc?: string
  zal_sc?: string
  maa_sc?: string
  dadi_sc?: string
  nani_sc?: string
  saas_sc?: string
}

export interface TelephoneRow {
  ghar_number: string
  number_1?: string
  number_2?: string
  number_3?: string
}

export interface ImportResult {
  success: number
  warnings: string[]
  errors: string[]
}

// ---- Helpers ----
function parseGender(val?: string): 'Male' | 'Female' {
  if (!val) return 'Male'
  const v = val.toLowerCase().trim()
  if (v === 'female' || v === 'f' || v === 'زال' || v === 'عورت') return 'Female'
  return 'Male'
}

function parseYear(val?: string | number | null): number | null {
  if (!val) return null
  const n = typeof val === 'number' ? val : parseInt(String(val), 10)
  if (isNaN(n)) return null
  // Handle Excel date serial numbers (e.g. 44927 = 2023-01-01)
  if (n > 1000 && n < 9999) return n   // already a year
  return null
}

// ---- Import Households ----
export async function importHouseholds(
  rows: HouseholdRow[],
  subCasteId: string
): Promise<ImportResult> {
  const supabase = await createClient()
  const result: ImportResult = { success: 0, warnings: [], errors: [] }

  for (const row of rows) {
    if (!row.ghar_number || !row.head_name) {
      result.warnings.push(`Row skipped — missing ghar_number or head_name`)
      continue
    }

    const { error } = await supabase.from('households').upsert({
      sub_caste_id:     subCasteId,
      ghar_number:      String(row.ghar_number).trim(),
      head_name:        String(row.head_name).trim(),
      head_father_name: row.head_father_name?.trim() || null,
      head_gender:      parseGender(row.head_gender),
      dob_year:         parseYear(row.dob_year),
      education:        row.education?.trim() || null,
      profession:       row.profession?.trim() || null,
      original_address: row.original_address?.trim() || null,
      orig_village_city: row.orig_village_city?.trim() || null,
      orig_district:    row.orig_district?.trim() || null,
      orig_country:     row.orig_country?.trim() || null,
      current_address:  row.current_address?.trim() || null,
      curr_village_city: row.curr_village_city?.trim() || null,
      curr_district:    row.curr_district?.trim() || null,
      curr_country:     row.curr_country?.trim() || null,
    } as any, { onConflict: 'sub_caste_id,ghar_number' })

    if (error) {
      result.errors.push(`Ghar ${row.ghar_number}: ${error.message}`)
    } else {
      result.success++
    }
  }

  if (result.success > 0) {
    await supabase.from('import_logs').insert({
      sub_caste_id: subCasteId,
      import_type:  'household',
      total_rows:   rows.length,
      success_rows: result.success,
      warning_rows: result.warnings.length,
    })

    // Auto-insert head names into Directory
    const names = rows.map(r => r.head_name).filter(Boolean) as string[]
    await batchInsertIntoDirectory(names, 'name')
  }

  return result
}

// ---- Import Members ----
export async function importMembers(
  rows: MemberRow[],
  subCasteId: string,
  mode: 'fresh' | 'reimport' = 'fresh'
): Promise<ImportResult> {
  const supabase = await createClient()
  const result: ImportResult = { success: 0, warnings: [], errors: [] }

  // Build ghar_number → household_id map
  const { data: households } = await supabase
    .from('households')
    .select('id, ghar_number')
    .eq('sub_caste_id', subCasteId)

  const gharMap = new Map(households?.map(h => [String(h.ghar_number).trim(), h.id]) ?? [])
  const hhIds = households?.map(h => h.id) ?? []

  // Re-import: delete existing members for this sub_caste then re-insert fresh
  if (mode === 'reimport' && hhIds.length > 0) {
    await supabase.from('members').delete().in('household_id', hhIds)
  }

  for (const row of rows) {
    if (!row.ghar_number || !row.name) {
      result.warnings.push(`Row skipped — missing ghar_number or name`)
      continue
    }

    const householdId = gharMap.get(String(row.ghar_number).trim())
    if (!householdId) {
      result.warnings.push(`Ghar ${row.ghar_number} not found — member "${row.name}" skipped`)
      continue
    }

    const { error } = await supabase.from('members').insert({
      household_id:  householdId,
      member_number: row.member_number ? Number(row.member_number) : null,
      name:          String(row.name).trim(),
      gender:        parseGender(row.gender),
      relation_code: String(row.relation_code).trim(),
      dob_year:      parseYear(row.dob_year),
      education:     row.education?.trim() || null,
      profession:    row.profession?.trim() || null,
      sub_caste_id:  subCasteId,
    })

    if (error) {
      result.errors.push(`Member "${row.name}" (Ghar ${row.ghar_number}): ${error.message}`)
    } else {
      result.success++
    }
  }

  if (result.success > 0) {
    await supabase.from('import_logs').insert({
      sub_caste_id: subCasteId,
      import_type:  'related',
      total_rows:   rows.length,
      success_rows: result.success,
      warning_rows: result.warnings.length,
    })

    // Auto-insert member names into Directory
    const names = rows.map(r => r.name).filter(Boolean) as string[]
    await batchInsertIntoDirectory(names, 'name')
  }

  return result
}

// ---- Import Sashan ----
export async function importSashan(
  rows: SashanRow[],
  subCasteId: string
): Promise<ImportResult> {
  const supabase = await createClient()
  const result: ImportResult = { success: 0, warnings: [], errors: [] }

  const { data: households } = await supabase
    .from('households')
    .select('id, ghar_number, sub_caste_id')
    .eq('sub_caste_id', subCasteId)

  const gharMap = new Map(households?.map(h => [String(h.ghar_number).trim(), h]) ?? [])

  // Get sub_caste name→id map for resolving sashan values
  const { data: subCastes } = await supabase.from('sub_castes').select('id, name')
  const scMap = new Map(subCastes?.map(s => [s.name.toLowerCase().trim(), s.id]) ?? [])

  function resolveScId(val?: string): string | null {
    if (!val?.trim()) return null
    return scMap.get(val.toLowerCase().trim()) ?? null
  }

  for (const row of rows) {
    if (!row.ghar_number) continue

    const household = gharMap.get(String(row.ghar_number).trim())
    if (!household) {
      result.warnings.push(`Ghar ${row.ghar_number} not found — sashan skipped`)
      continue
    }

    const zal = row.zal_sc ? [row.zal_sc.trim()] : []
    const maa = row.maa_sc ? [row.maa_sc.trim()] : []
    const dadi = row.dadi_sc ? [row.dadi_sc.trim()] : []
    const nani = row.nani_sc ? [row.nani_sc.trim()] : []
    const saas = row.saas_sc ? [row.saas_sc.trim()] : []

    const { error } = await supabase.from('relation_table').upsert({
      household_id: household.id,
      khud_sc:      household.sub_caste_id,
      zal_sc:       zal,
      maa_sc:       maa,
      dadi_sc:      dadi,
      nani_sc:      nani,
      saas_sc:      saas,
    }, { onConflict: 'household_id' })

    if (error) {
      result.errors.push(`Ghar ${row.ghar_number}: ${error.message}`)
    } else {
      result.success++
    }
  }

  if (result.success > 0) {
    await supabase.from('import_logs').insert({
      sub_caste_id: subCasteId,
      import_type:  'sashan',
      total_rows:   rows.length,
      success_rows: result.success,
      warning_rows: result.warnings.length,
    })
  }

  return result
}

// ---- Import Telephone ----
export async function importTelephone(
  rows: TelephoneRow[],
  subCasteId: string,
  mode: 'fresh' | 'reimport' = 'fresh'
): Promise<ImportResult> {
  const supabase = await createClient()
  const result: ImportResult = { success: 0, warnings: [], errors: [] }

  const { data: households } = await supabase
    .from('households')
    .select('id, ghar_number')
    .eq('sub_caste_id', subCasteId)

  const gharMap = new Map(households?.map(h => [String(h.ghar_number).trim(), h.id]) ?? [])
  const hhIds = households?.map(h => h.id) ?? []

  // Re-import: delete existing contacts for this sub_caste then re-insert fresh
  if (mode === 'reimport' && hhIds.length > 0) {
    await supabase.from('contacts').delete().in('household_id', hhIds)
  }

  for (const row of rows) {
    if (!row.ghar_number) continue

    const householdId = gharMap.get(String(row.ghar_number).trim())
    if (!householdId) {
      result.warnings.push(`Ghar ${row.ghar_number} not found — contacts skipped`)
      continue
    }

    const numbers = [row.number_1, row.number_2, row.number_3]
      .filter(Boolean)
      .map((n, i) => ({
        household_id:   householdId,
        contact_number: String(n).trim(),
        contact_type:   'mobile',
        display_order:  i + 1,
      }))

    if (numbers.length === 0) continue

    const { error } = await supabase.from('contacts').insert(numbers)
    if (error) {
      result.errors.push(`Ghar ${row.ghar_number}: ${error.message}`)
    } else {
      result.success += numbers.length
    }
  }

  if (result.success > 0) {
    await supabase.from('import_logs').insert({
      sub_caste_id: subCasteId,
      import_type:  'telephone',
      total_rows:   rows.length,
      success_rows: result.success,
      warning_rows: result.warnings.length,
    })
  }

  return result
}

// ---- Dispatch by type ----
export async function runImport(
  type: ImportType,
  rows: Record<string, string>[],
  subCasteId: string,
  mode: 'fresh' | 'reimport' = 'fresh'
): Promise<ImportResult> {
  switch (type) {
    case 'household': return importHouseholds(rows as unknown as HouseholdRow[], subCasteId)
    case 'related':   return importMembers(rows as unknown as MemberRow[], subCasteId, mode)
    case 'sashan':    return importSashan(rows as unknown as SashanRow[], subCasteId)
    case 'telephone': return importTelephone(rows as unknown as TelephoneRow[], subCasteId, mode)
  }
}
