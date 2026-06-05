'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createSubCaste(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name       = (formData.get('name') as string)?.trim()
  const casteId    = formData.get('caste_id') as string
  const nameSindhi = (formData.get('name_sindhi') as string)?.trim() || null
  const nameHindi  = (formData.get('name_hindi') as string)?.trim() || null

  if (!name || !casteId) return { error: 'Name and caste are required.' }

  const { error } = await supabase.from('sub_castes').insert({
    caste_id:    casteId,
    name,
    name_sindhi: nameSindhi,
    name_hindi:  nameHindi,
  })

  if (error) return { error: error.message }

  revalidatePath('/subcaste')
  return {}
}

export async function updateSubCaste(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('sub_castes').update({
    name:        (formData.get('name') as string)?.trim(),
    name_sindhi: (formData.get('name_sindhi') as string)?.trim() || null,
    name_hindi:  (formData.get('name_hindi') as string)?.trim() || null,
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/subcaste')
  return {}
}

export async function deleteSubCaste(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Check for linked households
  const { count } = await supabase
    .from('households')
    .select('id', { count: 'exact', head: true })
    .eq('sub_caste_id', id)

  if (count && count > 0) {
    return { error: `Cannot delete — ${count} household(s) are linked to this sub caste.` }
  }

  const { error } = await supabase.from('sub_castes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/subcaste')
  return {}
}
