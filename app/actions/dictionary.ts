'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addDictionaryEntry(
  wrongWord: string,
  correctWord: string,
  type: 'manual' | 'ai' = 'manual'
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('dictionary').insert({
    wrong_word: wrongWord.trim(),
    correct_word: correctWord.trim(),
    added_by_type: type,
    language_from: 'sindhi',
    language_to: 'english',
    is_verified: type === 'manual',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dictionary')
}

export async function verifyDictionaryEntry(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('dictionary')
    .update({ is_verified: true })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dictionary')
}

export async function removeDictionaryEntry(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('dictionary')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dictionary')
}
