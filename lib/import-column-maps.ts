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
  { key: 'ghar_number',         label: 'Ghar Number',         sindhi: 'گهر نمبر',        required: true  },
  { key: 'head_name_sindhi',    label: 'Head Name (Sindhi)',  sindhi: 'نالو',             required: true  },
  { key: 'head_gender',         label: 'Gender',              sindhi: 'صنف',              required: false },
  { key: 'head_father_name_sindhi', label: 'Father Name (Sindhi)', required: false },
  { key: 'dob_year',         label: 'Birth Year',          sindhi: 'جنم جي تاريخ',    required: false },
  { key: 'education',        label: 'Education',           sindhi: 'تعليم',            required: false },
  { key: 'profession',       label: 'Profession',          sindhi: 'ڪاروبار',          required: false },
  { key: 'original_address', label: 'Original Address',    sindhi: 'اصل پتو',         required: false },
  { key: 'orig_village_city',     label: 'Original Village / City', sindhi: 'اصل ڳوٺ/شهر', required: false },
  { key: 'orig_district',    label: 'Original District',   sindhi: 'اصل ضلعو',     required: false },
  { key: 'orig_country',     label: 'Original Country',    sindhi: 'اصل ملڪ',      required: false },
  { key: 'current_address',  label: 'Current Address',     sindhi: 'موجوده پتو',   required: false },
  { key: 'curr_village_city',     label: 'Current Village / City',  sindhi: 'موجوده ڳوٺ/شهر', required: false },
  { key: 'curr_district',    label: 'Current District',    sindhi: 'موجوده ضلعو',  required: false },
  { key: 'curr_country',     label: 'Current Country',     sindhi: 'موجوده ملڪ',   required: false },
]

export const RELATED_FIELDS: FieldDef[] = [
  { key: 'ghar_number',   label: 'Ghar Number',    sindhi: 'گهر نمبر',       required: true  },
  { key: 'member_number', label: 'Member Number',  sindhi: 'ڀاتي نمبر',      required: false },
  { key: 'name_sindhi',   label: 'Name (Sindhi)',  sindhi: 'پاتي جو نالو',   required: true  },
  { key: 'gender',        label: 'Gender',         sindhi: 'صنف',             required: false },
  { key: 'relation_code', label: 'Relation Code',  sindhi: 'رشتو',           required: true  },
  { key: 'dob_year',      label: 'Birth Year',     sindhi: 'جنم جي تاريخ',  required: false },
  { key: 'education',     label: 'Education',      sindhi: 'تعليم',           required: false },
  { key: 'profession',    label: 'Profession',     sindhi: 'ڪاروبار',         required: false },
  { key: 'sub_caste',     label: 'Sub Caste',      sindhi: 'نُڪ',            required: false },
  // Wife (Zal) only: her maika/father-side info. Stored as external text; an Admin can
  // later replace it with a real maika household link from the tree UI. Ignored on non-wife rows.
  { key: 'maiden_father_name', label: "Wife's Father Name (Sindhi)", sindhi: 'زال جو پيءُ', required: false },
  { key: 'maiden_sub_caste',   label: "Wife's Father Sub Caste",     sindhi: 'زال جي نُڪ',  required: false },
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
  'نالو': 'head_name_sindhi', 'head name': 'head_name_sindhi', 'head_name': 'head_name_sindhi', 'head_name_sindhi': 'head_name_sindhi', 'name': 'head_name_sindhi',
  'جنم جي تاريخ': 'dob_year', 'dob': 'dob_year', 'birth year': 'dob_year', 'dob_year': 'dob_year',
  'تعليم': 'education', 'education': 'education',
  'ڪاروبار': 'profession', 'profession': 'profession', 'business': 'profession',
  'اصل پتو': 'original_address', 'original address': 'original_address', 'original_address': 'original_address',
  'orig_village_city': 'orig_village_city', 'original village': 'orig_village_city', 'orig village': 'orig_village_city', 'original village/city': 'orig_village_city', 'village': 'orig_village_city', 'orig_taluka': 'orig_village_city', 'original taluka': 'orig_village_city', 'اصل تعلقو': 'orig_village_city', 'اصل ڳوٺ/شهر': 'orig_village_city',
  'orig_district': 'orig_district', 'original district': 'orig_district', 'orig district': 'orig_district', 'اصل ضلعو': 'orig_district',
  'orig_country': 'orig_country', 'original country': 'orig_country', 'orig country': 'orig_country', 'اصل ملڪ': 'orig_country',
  'موجوده پتو': 'current_address', 'current address': 'current_address', 'current_address': 'current_address',
  'curr_village_city': 'curr_village_city', 'current village': 'curr_village_city', 'curr village': 'curr_village_city', 'current village/city': 'curr_village_city', 'curr_taluka': 'curr_village_city', 'current taluka': 'curr_village_city', 'موجوده تعلقو': 'curr_village_city', 'موجوده ڳوٺ/شهر': 'curr_village_city',
  'curr_district': 'curr_district', 'current district': 'curr_district', 'curr district': 'curr_district', 'موجوده ضلعو': 'curr_district',
  'curr_country': 'curr_country', 'current country': 'curr_country', 'curr country': 'curr_country', 'موجوده ملڪ': 'curr_country',
  'صنف': 'head_gender', 'gender': 'head_gender', 'head_gender': 'head_gender',
  'head_father_name': 'head_father_name_sindhi', 'head_father_name_sindhi': 'head_father_name_sindhi', 'father name': 'head_father_name_sindhi', 'father_name': 'head_father_name_sindhi',
  'والد': 'head_father_name_sindhi', 'ولد': 'head_father_name_sindhi', 'والد جو نالو': 'head_father_name_sindhi', 'پيءُ': 'head_father_name_sindhi', 'پيءَ جو نالو': 'head_father_name_sindhi',
  // Related
  'ڀاتي نمبر': 'member_number', 'member number': 'member_number', 'member_number': 'member_number',
  'پاتي جو نالو': 'name_sindhi', 'member name': 'name_sindhi', 'name_sindhi': 'name_sindhi',
  'رشتو': 'relation_code', 'relation': 'relation_code', 'relation_code': 'relation_code',
  'نُڪ': 'sub_caste', 'sub caste': 'sub_caste', 'sub_caste': 'sub_caste',
  // Related — Wife's maiden / father-side (text fallback for an off-platform maika)
  'maiden_father_name': 'maiden_father_name', "wife's father": 'maiden_father_name', 'wife father name': 'maiden_father_name', 'wife father': 'maiden_father_name', 'maiden father name': 'maiden_father_name', 'زال جو پيءُ': 'maiden_father_name', 'سهرو': 'maiden_father_name',
  'maiden_sub_caste': 'maiden_sub_caste', 'wife father sub caste': 'maiden_sub_caste', "wife's father sub caste": 'maiden_sub_caste', 'maiden sub caste': 'maiden_sub_caste', 'زال جي نُڪ': 'maiden_sub_caste',
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

export function autoDetectMapping(headers: string[], importType?: ImportType): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const header of headers) {
    const normalized = header.trim().toLowerCase()
    let match = HEADER_ALIASES[header.trim()] ?? HEADER_ALIASES[normalized]
    // For members sheet: صنف / gender maps to 'gender', not 'head_gender'
    if (importType === 'related' && match === 'head_gender') match = 'gender'
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
