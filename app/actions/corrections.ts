'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CorrectionStatus = 'pending' | 'hold' | 'approved' | 'rejected'

// ---- Submit a correction request ----
export async function submitCorrection(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const tableName = formData.get('table_name') as string
  const recordId  = formData.get('record_id') as string
  const fieldName = formData.get('field_name') as string
  const oldValue  = (formData.get('old_value') as string)?.trim() || null
  const newValue  = (formData.get('new_value') as string)?.trim()

  if (!tableName || !recordId || !fieldName || !newValue) {
    return { error: 'All fields are required.' }
  }

  const { error } = await supabase.from('correction_requests').insert({
    table_name:   tableName,
    record_id:    recordId,
    field_name:   fieldName,
    old_value:    oldValue,
    new_value:    newValue,
    requested_by: user.id,
    status:       'pending',
  })

  if (error) return { error: error.message }

  revalidatePath('/corrections')
  return {}
}

// ---- Approve a correction (auto-updates the target record) ----
export async function approveCorrection(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can approve corrections.' }
  }

  const { data: req } = await supabase
    .from('correction_requests')
    .select('table_name, record_id, field_name, old_value, new_value')
    .eq('id', id)
    .single()

  if (!req) return { error: 'Correction request not found.' }

  // Apply the change to the target table
  const applyError = await applyCorrection(
    req.table_name,
    req.record_id,
    req.field_name,
    req.new_value
  )
  if (applyError) return { error: applyError }

  // Log to change_history
  await supabase.from('change_history').insert({
    table_name: req.table_name,
    record_id:  req.record_id,
    field_name: req.field_name,
    old_value:  req.old_value,
    new_value:  req.new_value,
    changed_by: user.id,
  })

  // Mark as approved
  await supabase.from('correction_requests').update({
    status:      'approved',
    reviewed_by: user.id,
  }).eq('id', id)

  revalidatePath('/corrections')
  return {}
}

// ---- Reject a correction ----
export async function rejectCorrection(
  id: string,
  reviewNote: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Only Admin or Chief can reject corrections.' }
  }

  await supabase.from('correction_requests').update({
    status:      'rejected',
    reviewed_by: user.id,
    review_note: reviewNote,
  }).eq('id', id)

  revalidatePath('/corrections')
  return {}
}

// ---- Put on hold ----
export async function holdCorrection(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('correction_requests').update({
    status:      'hold',
    reviewed_by: user.id,
  }).eq('id', id)

  revalidatePath('/corrections')
  return {}
}

// ---- Internal: apply the field change to the target table ----
async function applyCorrection(
  tableName: string,
  recordId: string,
  fieldName: string,
  newValue: string
): Promise<string | null> {
  const supabase = await createClient()

  const ALLOWED_TABLES: Record<string, string[]> = {
    households: ['head_name', 'head_gender', 'dob_year', 'education', 'profession', 'original_address', 'current_address'],
    members:    ['name', 'gender', 'relation_code', 'dob_year', 'education', 'profession'],
    contacts:   ['contact_number', 'contact_type'],
  }

  const allowed = ALLOWED_TABLES[tableName]
  if (!allowed) return `Table "${tableName}" is not supported for corrections.`
  if (!allowed.includes(fieldName)) return `Field "${fieldName}" is not supported for corrections.`

  // Cast numeric fields
  const numericFields = ['dob_year', 'member_number', 'display_order']
  const value = numericFields.includes(fieldName) ? Number(newValue) : newValue

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(tableName as any) as any)
    .update({ [fieldName]: value })
    .eq('id', recordId)

  if (error) return error.message
  return null
}

// ---- Fetch corrections list ----
export async function getCorrections(status?: CorrectionStatus | 'all') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile) return []

  let query = supabase
    .from('correction_requests')
    .select(`
      id, table_name, record_id, field_name,
      old_value, new_value, status, review_note,
      created_at, updated_at,
      requested_by, reviewed_by
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  // Verifier sees only their own
  if (profile.role === 'verifier') {
    query = query.eq('requested_by', user.id)
  }

  const { data } = await query
  return data ?? []
}
