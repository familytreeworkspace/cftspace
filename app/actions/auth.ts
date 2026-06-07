'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const credentials = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    return { error: error.message }
  }

  // Redirect viewer directly to tree, everyone else to dashboard
  const { data: profile } = await supabase
    .from('users').select('role').eq('id', (await supabase.auth.getUser()).data.user!.id).single()

  revalidatePath('/', 'layout')
  redirect(profile?.role === 'viewer' ? '/tree' : '/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
