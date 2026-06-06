'use server'

import { transliterateToSindhi } from '@/lib/transliteration'
import { createClient } from '@/lib/supabase/server'

function decryptCredential(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}

export async function getTransliteration(
  englishName: string,
  context?: string,
): Promise<{
  sindhi: string
  hindi: string
  confidence: number
  error?: string
}> {
  if (!englishName) {
    return { sindhi: '', hindi: '', confidence: 0, error: 'Name is required' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { sindhi: '', hindi: '', confidence: 0, error: 'Not authenticated' }

    // Auto-detect: find first active api_key credential
    const { data: credentials } = await supabase
      .from('ai_credentials')
      .select('provider, auth_type, credential_encrypted')
      .eq('user_id', user.id)
      .eq('is_active', true) as any

    if (!credentials || credentials.length === 0) {
      return {
        sindhi: '', hindi: '', confidence: 0,
        error: 'No AI credentials found. Go to Settings and add an API Key.',
      }
    }

    // Find a credential with api_key auth type
    const apiKeyCred = credentials.find((c: any) => c.auth_type === 'api_key')
    if (!apiKeyCred) {
      return {
        sindhi: '', hindi: '', confidence: 0,
        error: 'AI suggest requires an API Key. Your saved credential uses "' +
          credentials[0].auth_type + '" — please update it in Settings with auth type "API Key".',
      }
    }

    const credential = decryptCredential(apiKeyCred.credential_encrypted)
    const provider = apiKeyCred.provider as string

    const result = await transliterateToSindhi(englishName, context, credential, provider, 'api_key')
    return result
  } catch (err: any) {
    return {
      sindhi: '', hindi: '', confidence: 0,
      error: err.message || 'Transliteration failed',
    }
  }
}

export async function saveSindhiTranslation(
  table: 'households' | 'members',
  recordId: string,
  sindhiName: string,
  hindiName: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const columnNamePrefix = table === 'households' ? 'head_name' : 'name'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    updateData[columnNamePrefix + '_sindhi'] = sindhiName || null
    updateData[columnNamePrefix + '_hindi'] = hindiName || null

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', recordId)

    if (error) return { error: error.message }

    return {}
  } catch (err: any) {
    return { error: err.message || 'Failed to save translation' }
  }
}
