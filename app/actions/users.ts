'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateUserRole(
  userId: string,
  role: 'chief' | 'admin' | 'verifier' | 'viewer',
  casteId?: string,
  name?: string,
  email?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Not authorized.' }
  }
  // Admin cannot assign chief or admin roles
  if (profile.role === 'admin' && (role === 'chief' || role === 'admin')) {
    return { error: 'Admin can only assign Verifier and Viewer roles.' }
  }
  // Only Chief can update name and email
  if ((name || email) && profile.role !== 'chief') {
    return { error: 'Only Chief can update name and email.' }
  }

  const updateData: any = {
    role,
    caste_id: casteId ?? null,
  }
  if (name) updateData.name = name
  if (email) updateData.email = email

  const { error } = await supabase.from('users').update(updateData).eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/users')
  return {}
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('users')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/users')
  return {}
}

export async function createUser(
  name: string,
  email: string,
  role: 'chief' | 'admin' | 'verifier' | 'viewer',
  casteId?: string,
  customPassword?: string
): Promise<{ error?: string; password?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Not authorized.' }
  }

  // Admin cannot create chiefs
  if (profile.role === 'admin' && role === 'chief') {
    return { error: 'Admin cannot assign Chief role.' }
  }

  // Validate inputs
  if (!name?.trim()) return { error: 'Name is required.' }
  if (!email?.trim()) return { error: 'Email is required.' }

  try {
    const admin = createAdminClient()

    // Use custom password if provided, otherwise generate one
    const password = customPassword?.trim() ? customPassword.trim() : generatePassword()

    // Create auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    if (authError) return { error: authError.message }
    if (!authUser?.user?.id) return { error: 'Failed to create auth user.' }

    // Create user record in database
    const { error: dbError } = await supabase.from('users').insert({
      id: authUser.user.id,
      name: name.trim(),
      email: email.trim(),
      role,
      caste_id: casteId || null,
      is_active: true,
    })

    if (dbError) return { error: dbError.message }

    revalidatePath('/users')
    return { password }
  } catch (err: any) {
    return { error: err.message || 'Failed to create user.' }
  }
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    return { error: 'Not authorized.' }
  }

  // Cannot delete Chief
  const { data: targetUser } = await supabase
    .from('users').select('role').eq('id', userId).single()
  if (targetUser?.role === 'chief') {
    return { error: 'Cannot delete Chief user.' }
  }

  try {
    const admin = createAdminClient()

    // Delete from Supabase Auth
    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) return { error: authError.message }

    // Delete from users table
    const { error: dbError } = await supabase.from('users').delete().eq('id', userId)
    if (dbError) return { error: dbError.message }

    revalidatePath('/users')
    return {}
  } catch (err: any) {
    return { error: err.message || 'Failed to delete user.' }
  }
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'chief') {
    return { error: 'Only Chief can reset passwords.' }
  }

  try {
    const admin = createAdminClient()

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) return { error: error.message }

    revalidatePath('/users')
    return {}
  } catch (err: any) {
    return { error: err.message || 'Failed to update password.' }
  }
}

function generatePassword(): string {
  // Generate password: 12 chars with mix of upper, lower, numbers, special
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '@#$%&*!'

  let password = ''
  password += upper[Math.floor(Math.random() * upper.length)]
  password += lower[Math.floor(Math.random() * lower.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  const all = upper + lower + numbers + special
  for (let i = 0; i < 8; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}
