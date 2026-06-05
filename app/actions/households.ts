'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ---- Household Actions ----

export async function createHousehold(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const gharNumber = (formData.get('ghar_number') as string)?.trim()
  const headName   = (formData.get('head_name') as string)?.trim()
  const subCasteId = formData.get('sub_caste_id') as string

  if (!gharNumber || !headName || !subCasteId) {
    return { error: 'Ghar number, head name, and sub caste are required.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertData: any = {
    sub_caste_id:      subCasteId,
    ghar_number:       gharNumber,
    head_name:         headName,
    head_name_sindhi:  (formData.get('head_name_sindhi') as string)?.trim() || null,
    head_name_hindi:   (formData.get('head_name_hindi') as string)?.trim() || null,
    head_gender:       (formData.get('head_gender') as 'Male' | 'Female') || 'Male',
    dob_year:          formData.get('dob_year') ? Number(formData.get('dob_year')) : null,
    education:         (formData.get('education') as string)?.trim() || null,
    profession:        (formData.get('profession') as string)?.trim() || null,
    original_address:  (formData.get('original_address') as string)?.trim() || null,
    current_address:   (formData.get('current_address') as string)?.trim() || null,
  }

  const { data, error } = await supabase
    .from('households')
    .insert(insertData)
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Auto-create relation_table entry
  await supabase.from('relation_table').insert({
    household_id: data.id,
    khud_sc: subCasteId,
  })

  revalidatePath('/households')
  redirect(`/households/${data.id}`)
}

export async function updateHousehold(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    sub_caste_id:      formData.get('sub_caste_id') as string,
    ghar_number:       (formData.get('ghar_number') as string)?.trim(),
    head_name:         (formData.get('head_name') as string)?.trim(),
    head_name_sindhi:  (formData.get('head_name_sindhi') as string)?.trim() || null,
    head_name_hindi:   (formData.get('head_name_hindi') as string)?.trim() || null,
    head_gender:       (formData.get('head_gender') as 'Male' | 'Female') || 'Male',
    dob_year:          formData.get('dob_year') ? Number(formData.get('dob_year')) : null,
    education:         (formData.get('education') as string)?.trim() || null,
    profession:        (formData.get('profession') as string)?.trim() || null,
    original_address:  (formData.get('original_address') as string)?.trim() || null,
    current_address:   (formData.get('current_address') as string)?.trim() || null,
  }

  const { error } = await supabase
    .from('households')
    .update(updateData)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/households/${id}`)
  revalidatePath('/households')
  redirect(`/households/${id}`)
}

export async function deleteHousehold(id: string) {
  const supabase = await createClient()
  await supabase.from('households').update({ is_active: false }).eq('id', id)
  revalidatePath('/households')
  redirect('/households')
}

// ---- Member Actions ----

export async function createMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const householdId = formData.get('household_id') as string
  const name        = (formData.get('name') as string)?.trim()
  const relationCode = (formData.get('relation_code') as string)?.trim()

  if (!householdId || !name || !relationCode) {
    return { error: 'Name and relation code are required.' }
  }

  // Get household's sub_caste_id for auto-assign
  const { data: household } = await supabase
    .from('households')
    .select('sub_caste_id')
    .eq('id', householdId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertData: any = {
    household_id:  householdId,
    name,
    name_sindhi:   (formData.get('name_sindhi') as string)?.trim() || null,
    name_hindi:    (formData.get('name_hindi') as string)?.trim() || null,
    gender:        (formData.get('gender') as 'Male' | 'Female') || 'Male',
    relation_code: relationCode,
    dob_year:      formData.get('dob_year') ? Number(formData.get('dob_year')) : null,
    education:     (formData.get('education') as string)?.trim() || null,
    profession:    (formData.get('profession') as string)?.trim() || null,
    sub_caste_id:  (formData.get('sub_caste_id') as string) || household?.sub_caste_id || null,
    member_number: formData.get('member_number') ? Number(formData.get('member_number')) : null,
  }

  const { error } = await supabase.from('members').insert(insertData)

  if (error) return { error: error.message }

  revalidatePath(`/households/${householdId}`)
  return { success: true }
}

export async function updateMember(id: string, householdId: string, formData: FormData) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    name:          (formData.get('name') as string)?.trim(),
    name_sindhi:   (formData.get('name_sindhi') as string)?.trim() || null,
    name_hindi:    (formData.get('name_hindi') as string)?.trim() || null,
    gender:        (formData.get('gender') as 'Male' | 'Female') || 'Male',
    relation_code: (formData.get('relation_code') as string)?.trim(),
    dob_year:      formData.get('dob_year') ? Number(formData.get('dob_year')) : null,
    education:     (formData.get('education') as string)?.trim() || null,
    profession:    (formData.get('profession') as string)?.trim() || null,
    sub_caste_id:  (formData.get('sub_caste_id') as string) || null,
  }

  const { error } = await supabase.from('members').update(updateData).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/households/${householdId}`)
  return { success: true }
}

export async function deleteMember(id: string, householdId: string) {
  const supabase = await createClient()
  await supabase.from('members').delete().eq('id', id)
  revalidatePath(`/households/${householdId}`)
  return { success: true }
}

// ---- Contact Actions ----

export async function addContact(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const householdId = formData.get('household_id') as string
  const number      = (formData.get('contact_number') as string)?.trim()
  if (!householdId || !number) return

  await supabase.from('contacts').insert({
    household_id:   householdId,
    contact_number: number,
    contact_type:   (formData.get('contact_type') as string) || 'mobile',
    display_order:  1,
  })
  revalidatePath(`/households/${householdId}`)
}

export async function deleteContact(id: string, householdId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('contacts').delete().eq('id', id)
  revalidatePath(`/households/${householdId}`)
}
