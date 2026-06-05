// Client-side Excel export using xlsx
import * as XLSX from 'xlsx'

export function exportToExcel(
  rows: Record<string, unknown>[],
  headers: { key: string; label: string }[],
  fileName: string
) {
  if (rows.length === 0) return

  // Build sheet data with header row
  const sheetData = [
    headers.map(h => h.label),
    ...rows.map(row => headers.map(h => row[h.key] ?? '')),
  ]

  const ws = XLSX.utils.aoa_to_sheet(sheetData)

  // Auto-width columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.label.length,
      ...rows.map(r => String(r[h.key] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

// Common report header sets
export const SUBCASTE_HEADERS = [
  { key: 'ghar_number',     label: 'Ghar #' },
  { key: 'head_name',       label: 'Head Name' },
  { key: 'head_gender',     label: 'Gender' },
  { key: 'dob_year',        label: 'Birth Year' },
  { key: 'education',       label: 'Education' },
  { key: 'profession',      label: 'Profession' },
  { key: 'original_address',label: 'Original Address' },
  { key: 'current_address', label: 'Current Address' },
  { key: 'member_count',    label: 'Members' },
]

export const PERSON_HEADERS = [
  { key: 'ghar_number',    label: 'Ghar #' },
  { key: 'name',           label: 'Name' },
  { key: 'gender',         label: 'Gender' },
  { key: 'relation_code',  label: 'Relation' },
  { key: 'dob_year',       label: 'Birth Year' },
  { key: 'age',            label: 'Age' },
  { key: 'sub_caste_name', label: 'Sub Caste' },
]

export const PROFESSION_HEADERS = [
  { key: 'ghar_number',    label: 'Ghar #' },
  { key: 'name',           label: 'Name' },
  { key: 'gender',         label: 'Gender' },
  { key: 'relation_code',  label: 'Relation' },
  { key: 'profession',     label: 'Profession' },
  { key: 'dob_year',       label: 'Birth Year' },
  { key: 'sub_caste_name', label: 'Sub Caste' },
]

export const EDUCATION_HEADERS = [
  { key: 'ghar_number',    label: 'Ghar #' },
  { key: 'name',           label: 'Name' },
  { key: 'gender',         label: 'Gender' },
  { key: 'relation_code',  label: 'Relation' },
  { key: 'education',      label: 'Education' },
  { key: 'dob_year',       label: 'Birth Year' },
  { key: 'sub_caste_name', label: 'Sub Caste' },
]

export const VILLAGE_HEADERS = [
  { key: 'ghar_number',     label: 'Ghar #' },
  { key: 'head_name',       label: 'Head Name' },
  { key: 'sub_caste_name',  label: 'Sub Caste' },
  { key: 'original_address',label: 'Original Address' },
  { key: 'current_address', label: 'Current Address' },
  { key: 'member_count',    label: 'Members' },
]

export const MARRIED_VILLAGE_HEADERS = [
  { key: 'ghar_number',      label: 'Ghar #' },
  { key: 'head_name',        label: 'Head Name' },
  { key: 'wife_name',        label: 'Wife Name' },
  { key: 'original_address', label: 'Address' },
  { key: 'sub_caste_name',   label: 'Sub Caste' },
]
