export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

type NoRelationships = { Relationships: [] }

export interface Database {
  public: {
    Tables: {
      platforms: {
        Row:           { id: string; name: string; created_by: string | null; created_at: string }
        Insert:        { id?: string; name: string; created_by?: string | null; created_at?: string }
        Update:        { id?: string; name?: string; created_by?: string | null }
        Relationships: []
      }
      castes: {
        Row:           { id: string; platform_id: string | null; name: string; name_sindhi: string | null; name_hindi: string | null; created_at: string }
        Insert:        { id?: string; platform_id?: string | null; name: string; name_sindhi?: string | null; name_hindi?: string | null }
        Update:        { id?: string; platform_id?: string | null; name?: string; name_sindhi?: string | null; name_hindi?: string | null }
        Relationships: []
      }
      sub_castes: {
        Row:           { id: string; caste_id: string | null; name: string; name_sindhi: string | null; name_hindi: string | null; created_at: string }
        Insert:        { id?: string; caste_id?: string | null; name: string; name_sindhi?: string | null; name_hindi?: string | null }
        Update:        { id?: string; caste_id?: string | null; name?: string; name_sindhi?: string | null; name_hindi?: string | null }
        Relationships: []
      }
      villages: {
        Row:           { id: string; name: string; name_sindhi: string | null; district: string | null; province: string | null; created_at: string }
        Insert:        { id?: string; name: string; name_sindhi?: string | null; district?: string | null; province?: string | null }
        Update:        { id?: string; name?: string; name_sindhi?: string | null; district?: string | null; province?: string | null }
        Relationships: []
      }
      users: {
        Row:           { id: string; name: string; email: string; role: 'chief' | 'admin' | 'verifier' | 'viewer'; caste_id: string | null; is_active: boolean; created_at: string }
        Insert:        { id: string; name: string; email: string; role: 'chief' | 'admin' | 'verifier' | 'viewer'; caste_id?: string | null; is_active?: boolean }
        Update:        { id?: string; name?: string; email?: string; role?: 'chief' | 'admin' | 'verifier' | 'viewer'; caste_id?: string | null; is_active?: boolean }
        Relationships: []
      }
      households: {
        Row: {
          id: string; sub_caste_id: string | null; village_id: string | null
          ghar_number: string; head_name: string; head_gender: 'Male' | 'Female'
          dob_year: number | null; dob_full: string | null
          education: string | null; profession: string | null
          original_address: string | null; current_address: string | null
          photo_url: string | null; is_active: boolean
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; sub_caste_id?: string | null; village_id?: string | null
          ghar_number: string; head_name: string; head_gender?: 'Male' | 'Female'
          dob_year?: number | null; dob_full?: string | null
          education?: string | null; profession?: string | null
          original_address?: string | null; current_address?: string | null
          photo_url?: string | null; is_active?: boolean
        }
        Update: {
          id?: string; sub_caste_id?: string | null; village_id?: string | null
          ghar_number?: string; head_name?: string; head_gender?: 'Male' | 'Female'
          dob_year?: number | null; dob_full?: string | null
          education?: string | null; profession?: string | null
          original_address?: string | null; current_address?: string | null
          photo_url?: string | null; is_active?: boolean
        }
        Relationships: []
      }
      members: {
        Row: {
          id: string; household_id: string; member_number: number | null
          name: string; gender: 'Male' | 'Female'; relation_code: string
          dob_year: number | null; dob_full: string | null
          education: string | null; profession: string | null
          sub_caste_id: string | null; photo_url: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; household_id: string; member_number?: number | null
          name: string; gender?: 'Male' | 'Female'; relation_code: string
          dob_year?: number | null; dob_full?: string | null
          education?: string | null; profession?: string | null
          sub_caste_id?: string | null; photo_url?: string | null
        }
        Update: {
          id?: string; household_id?: string; member_number?: number | null
          name?: string; gender?: 'Male' | 'Female'; relation_code?: string
          dob_year?: number | null; dob_full?: string | null
          education?: string | null; profession?: string | null
          sub_caste_id?: string | null; photo_url?: string | null
        }
        Relationships: []
      }
      relation_table: {
        Row: {
          id: string; household_id: string
          khud_sc: string | null
          zal_sc: Json; maa_sc: Json; dadi_sc: Json; nani_sc: Json; saas_sc: Json
          khud_sc_manual: string | null; khud_sc_is_manual: boolean
          zal_sc_manual: Json; zal_sc_is_manual: boolean
          maa_sc_manual: Json; maa_sc_is_manual: boolean
          dadi_sc_manual: Json; dadi_sc_is_manual: boolean
          nani_sc_manual: Json; nani_sc_is_manual: boolean
          saas_sc_manual: Json; saas_sc_is_manual: boolean
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; household_id: string
          khud_sc?: string | null
          zal_sc?: Json; maa_sc?: Json; dadi_sc?: Json; nani_sc?: Json; saas_sc?: Json
          khud_sc_manual?: string | null; khud_sc_is_manual?: boolean
          zal_sc_manual?: Json; zal_sc_is_manual?: boolean
          maa_sc_manual?: Json; maa_sc_is_manual?: boolean
          dadi_sc_manual?: Json; dadi_sc_is_manual?: boolean
          nani_sc_manual?: Json; nani_sc_is_manual?: boolean
          saas_sc_manual?: Json; saas_sc_is_manual?: boolean
        }
        Update: {
          id?: string; household_id?: string
          khud_sc?: string | null
          zal_sc?: Json; maa_sc?: Json; dadi_sc?: Json; nani_sc?: Json; saas_sc?: Json
          khud_sc_is_manual?: boolean; zal_sc_is_manual?: boolean
          maa_sc_is_manual?: boolean; dadi_sc_is_manual?: boolean
          nani_sc_is_manual?: boolean; saas_sc_is_manual?: boolean
        }
        Relationships: []
      }
      contacts: {
        Row:           { id: string; household_id: string; member_id: string | null; contact_number: string; contact_type: string; display_order: number; created_at: string }
        Insert:        { id?: string; household_id: string; member_id?: string | null; contact_number: string; contact_type?: string; display_order?: number }
        Update:        { id?: string; household_id?: string; member_id?: string | null; contact_number?: string; contact_type?: string; display_order?: number }
        Relationships: []
      }
      family_links: {
        Row:           { id: string; member_id: string; father_id: string | null; mother_id: string | null; spouse_id: string | null; link_type: string; created_by: string | null; verified: boolean; created_at: string }
        Insert:        { id?: string; member_id: string; father_id?: string | null; mother_id?: string | null; spouse_id?: string | null; link_type?: string; created_by?: string | null; verified?: boolean }
        Update:        { id?: string; member_id?: string; father_id?: string | null; mother_id?: string | null; spouse_id?: string | null; link_type?: string; verified?: boolean }
        Relationships: []
      }
      correction_requests: {
        Row:           { id: string; table_name: string; record_id: string; field_name: string; old_value: string | null; new_value: string; requested_by: string | null; status: 'pending' | 'hold' | 'approved' | 'rejected'; reviewed_by: string | null; review_note: string | null; created_at: string; updated_at: string }
        Insert:        { id?: string; table_name: string; record_id: string; field_name: string; old_value?: string | null; new_value: string; requested_by?: string | null; status?: 'pending' | 'hold' | 'approved' | 'rejected'; reviewed_by?: string | null; review_note?: string | null }
        Update:        { id?: string; table_name?: string; record_id?: string; field_name?: string; old_value?: string | null; new_value?: string; status?: 'pending' | 'hold' | 'approved' | 'rejected'; reviewed_by?: string | null; review_note?: string | null }
        Relationships: []
      }
      dictionary: {
        Row:           { id: string; wrong_word: string; correct_word: string; language_from: string; language_to: string; added_by_type: 'manual' | 'ai'; confidence: number | null; is_verified: boolean; created_at: string }
        Insert:        { id?: string; wrong_word: string; correct_word: string; language_from?: string; language_to?: string; added_by_type?: 'manual' | 'ai'; confidence?: number | null; is_verified?: boolean }
        Update:        { id?: string; wrong_word?: string; correct_word?: string; language_from?: string; language_to?: string; added_by_type?: 'manual' | 'ai'; confidence?: number | null; is_verified?: boolean }
        Relationships: []
      }
      import_logs: {
        Row:           { id: string; sub_caste_id: string | null; import_type: 'household' | 'related' | 'sashan' | 'telephone'; file_name: string | null; total_rows: number; success_rows: number; warning_rows: number; imported_by: string | null; created_at: string }
        Insert:        { id?: string; sub_caste_id?: string | null; import_type: 'household' | 'related' | 'sashan' | 'telephone'; file_name?: string | null; total_rows?: number; success_rows?: number; warning_rows?: number; imported_by?: string | null }
        Update:        { id?: string; sub_caste_id?: string | null; import_type?: 'household' | 'related' | 'sashan' | 'telephone'; file_name?: string | null; total_rows?: number; success_rows?: number; warning_rows?: number }
        Relationships: []
      }
      change_history: {
        Row:           { id: string; table_name: string; record_id: string; field_name: string; old_value: string | null; new_value: string | null; changed_by: string | null; created_at: string }
        Insert:        { id?: string; table_name: string; record_id: string; field_name: string; old_value?: string | null; new_value?: string | null; changed_by?: string | null }
        Update:        { id?: string; table_name?: string; record_id?: string; field_name?: string; old_value?: string | null; new_value?: string | null }
        Relationships: []
      }
    }
    Views:          Record<string, never>
    Functions: {
      get_my_role:       { Args: Record<never, never>; Returns: string }
      get_my_caste_id:   { Args: Record<never, never>; Returns: string }
      is_chief_or_admin: { Args: Record<never, never>; Returns: boolean }
    }
    Enums:          Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
