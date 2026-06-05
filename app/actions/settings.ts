'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function encryptCredential(credential: string): string {
  return Buffer.from(credential).toString('base64')
}

function decryptCredential(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}

export async function saveAiCredential(
  provider: string,
  authType: string,
  credentialValue: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!provider?.trim()) {
    return { error: 'Provider name is required' }
  }

  if (!authType?.trim()) {
    return { error: 'Authentication type is required' }
  }

  if (!credentialValue?.trim()) {
    return { error: 'Credential value is required' }
  }

  const validAuthTypes = ['api_key', 'user_id', 'email', 'token', 'custom']
  if (!validAuthTypes.includes(authType)) {
    return { error: 'Invalid authentication type' }
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(provider)) {
    return { error: 'Provider name can only contain letters, numbers, hyphens, and underscores' }
  }

  const encrypted = encryptCredential(credentialValue.trim())
  const normalizedProvider = provider.toLowerCase().trim()

  try {
    const { error } = await supabase
      .from('ai_credentials')
      .upsert({
        user_id: user.id,
        provider: normalizedProvider,
        auth_type: authType,
        credential_encrypted: encrypted,
        is_active: true,
      } as any, {
        onConflict: 'user_id,provider',
      })

    if (error) return { error: error.message }

    revalidatePath('/settings')
    return {}
  } catch (err: any) {
    return { error: err.message || 'Failed to save credential' }
  }
}

export async function deleteAiCredential(credentialId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { error } = await supabase
      .from('ai_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/settings')
    return {}
  } catch (err: any) {
    return { error: err.message || 'Failed to delete credential' }
  }
}

export async function getAiCredential(provider: string): Promise<{
  authType?: string
  credential?: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const normalizedProvider = provider.toLowerCase().trim()
    const { data, error } = await supabase
      .from('ai_credentials')
      .select('auth_type, credential_encrypted')
      .eq('user_id', user.id)
      .eq('provider', normalizedProvider)
      .eq('is_active', true)
      .single() as any

    if (error) return { error: error.message }
    if (!data) return { error: 'Credential not found' }

    const decrypted = decryptCredential((data as any).credential_encrypted)
    return {
      authType: (data as any).auth_type,
      credential: decrypted
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to retrieve credential' }
  }
}
