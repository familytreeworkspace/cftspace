// Sindhi Excel header → our DB field name
// Covers common variations (with/without diacritics, extra spaces)

export type ImportType = 'household' | 'related' | 'sashan' | 'telephone'

export interface FieldDef {
  key: string
  label: string        // English display label
  sindhi?: string      // Sindhi label for reference
  required: boolean
}

export const HOUSEHOLD_FIELDS: FieldDef[] = [
  { key: 'ghar_number',      label: 'Ghar Number',       sindhi: 'گهر نمبر',        required: true  },
  { key: 'head_name',        label: 'Head Name',         sindhi: 'نالو',             required: true  },
  { key: 'head_gender',      label: 'Gender',            sindhi: 'صنف',              required: false },
  { key: 'dob_year',         label: 'Birth Year',        sindhi: 'جنم جي تاريخ',    required: false },
  { key: 'education',        label: 'Education',         sindhi: 'تعليم',            required: false },
  { key: 'profession',       label: 'Profession',        sindhi: 'ڪاروبار',          required: false },
  { key: 'original_address', label: 'Original Address',  sindhi: 'اصل پتو',         required: false },
  { key: 'current_address',  label: 'Current Address',   sindhi: 'موجوده پتو',       required: false },
]

export const RELATED_FIELDS: FieldDef[] = [
  { key: 'ghar_number',   label: 'Ghar Number',    sindhi: 'گهر نمبر',       required: true  },
  { key: 'member_number', label: 'Member Number',  sindhi: 'ڀاتي نمبر',      required: false },
  { key: 'name',          label: 'Name',           sindhi: 'پاتي جو نالو',   required: true  },
  { key: 'relation_code', label: 'Relation Code',  sindhi: 'رشتو',           required: true  },
  { key: 'gender',        label: 'Gender',         sindhi: 'صنف',             required: false },
  { key: 'dob_year',      label: 'Birth Year',     sindhi: 'جنم جي تاريخ',  required: false },
  { key: 'education',     label: 'Education',      sindhi: 'تعليم',           required: false },
  { key: 'profession',    label: 'Profession',     sindhi: 'ڪاروبار',         required: false },
  { key: 'sub_caste',     label: 'Sub Caste',      sindhi: 'نُڪ',            required: false },
]

export const SASHAN_FIELDS: FieldDef[] = [
  { key: 'ghar_number', label: 'Ghar Number', sindhi: 'گهر نمبر', required: true  },
  { key: 'khud_sc',     label: 'Khud (Self)', sindhi: 'خود',       required: false },
  { key: 'zal_sc',      label: 'Zal (Wife)',  sindhi: 'زال',       required: false },
  { key: 'maa_sc',      label: 'Maa',         sindhi: 'ماءُ',      required: false },
  { key: 'dadi_sc',     label: 'Dadi',        sindhi: 'ڏاڏي',      required: false },
  { key: 'nani_sc',     label: 'Nani',        sindhi: 'ناني',      required: false },
  { key: 'saas_sc',     label: 'Saas',        sindhi: 'سَس',       required: false },
]

export const TELEPHONE_FIELDS: FieldDef[] = [
  { key: 'ghar_number', label: 'Ghar Number', sindhi: 'گهر نمبر', required: true  },
  { key: 'number_1',    label: 'Number 1',    required: false },
  { key: 'number_2',    label: 'Number 2',    required: false },
  { key: 'number_3',    label: 'Number 3',    required: false },
]

export const FIELDS_BY_TYPE: Record<ImportType, FieldDef[]> = {
  household: HOUSEHOLD_FIELDS,
  related:   RELATED_FIELDS,
  sashan:    SASHAN_FIELDS,
  telephone: TELEPHONE_FIELDS,
}

// Auto-detect: normalize Sindhi/English header → field key
const HEADER_ALIASES: Record<string, string> = {
  // Household
  'گهر نمبر': 'ghar_number', 'ghar number': 'ghar_number', 'ghar_number': 'ghar_number', 'house no': 'ghar_number',
  'نالو': 'head_name', 'head name': 'head_name', 'head_name': 'head_name', 'name': 'head_name',
  'جنم جي تاريخ': 'dob_year', 'dob': 'dob_year', 'birth year': 'dob_year', 'dob_year': 'dob_year',
  'تعليم': 'education', 'education': 'education',
  'ڪاروبار': 'profession', 'profession': 'profession', 'business': 'profession',
  'اصل پتو': 'original_address', 'original address': 'original_address', 'original_address': 'original_address',
  'موجوده پتو': 'current_address', 'current address': 'current_address', 'current_address': 'current_address',
  'صنف': 'head_gender', 'gender': 'head_gender',
  // Related
  'ڀاتي نمبر': 'member_number', 'member number': 'member_number', 'member_number': 'member_number',
  'پاتي جو نالو': 'name', 'member name': 'name',
  'رشتو': 'relation_code', 'relation': 'relation_code', 'relation_code': 'relation_code',
  'نُڪ': 'sub_caste', 'sub caste': 'sub_caste', 'sub_caste': 'sub_caste',
  // Sashan
  'خود': 'khud_sc', 'khud': 'khud_sc',
  'زال': 'zal_sc', 'zal': 'zal_sc', 'wife': 'zal_sc',
  'ماءُ': 'maa_sc', 'ماء': 'maa_sc', 'maa': 'maa_sc', 'mother': 'maa_sc',
  'ڏاڏي': 'dadi_sc', 'dadi': 'dadi_sc',
  'ناني': 'nani_sc', 'nani': 'nani_sc',
  'سَس': 'saas_sc', 'سس': 'saas_sc', 'saas': 'saas_sc',
  // Telephone
  'number_1': 'number_1', 'number 1': 'number_1', 'phone 1': 'number_1', 'tel 1': 'number_1',
  'number_2': 'number_2', 'number 2': 'number_2', 'phone 2': 'number_2', 'tel 2': 'number_2',
  'number_3': 'number_3', 'number 3': 'number_3', 'phone 3': 'number_3', 'tel 3': 'number_3',
}

export function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const header of headers) {
    const normalized = header.trim().toLowerCase()
    const match = HEADER_ALIASES[header.trim()] ?? HEADER_ALIASES[normalized]
    mapping[header] = match ?? ''
  }
  return mapping
}

export const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  household: 'Household Sheet',
  related:   'Members (Related) Sheet',
  sashan:    'Sashan (Relations) Sheet',
  telephone: 'Telephone Sheet',
}

export const IMPORT_SEQUENCE: ImportType[] = ['household', 'related', 'sashan', 'telephone']
