'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createCaste(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name       = (formData.get('name') as string)?.trim()
  const nameSindhi = (formData.get('name_sindhi') as string)?.trim() || null
  const nameHindi  = (formData.get('name_hindi') as string)?.trim() || null

  if (!name) return { error: 'Caste name is required.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertData: any = {
    name,
    name_sindhi: nameSindhi,
    name_hindi:  nameHindi,
  }

  const { error } = await supabase.from('castes').insert(insertData)

  if (error) return { error: error.message }

  revalidatePath('/caste')
  return {}
}

export async function updateCaste(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    name:        (formData.get('name') as string)?.trim(),
    name_sindhi: (formData.get('name_sindhi') as string)?.trim() || null,
    name_hindi:  (formData.get('name_hindi') as string)?.trim() || null,
  }

  const { error } = await supabase.from('castes').update(updateData).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/caste')
  return {}
}

export async function deleteCaste(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Check for linked sub castes
  const { count } = await supabase
    .from('sub_castes')
    .select('id', { count: 'exact', head: true })
    .eq('caste_id', id)

  if (count && count > 0) {
    return { error: `Cannot delete — ${count} sub-caste(s) are linked to this caste.` }
  }

  const { error } = await supabase.from('castes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/caste')
  return {}
}
