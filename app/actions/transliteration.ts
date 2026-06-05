'use server'

import { transliterateToSindhi } from '@/lib/transliteration'
import { createClient } from '@/lib/supabase/server'
import { getAiCredential } from './settings'

export async function getTransliteration(
  englishName: string,
  context?: string,
  provider: string = 'anthropic'
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
    // Get the user's AI credential for the specified provider
    const { authType, credential, error: credError } = await getAiCredential(provider)

    if (credError || !credential) {
      return {
        sindhi: '',
        hindi: '',
        confidence: 0,
        error: `${provider} credential not configured. Please add it in Settings → AI Service Credentials.`,
      }
    }

    // For Anthropic, we expect API key auth type
    if (provider === 'anthropic' && authType !== 'api_key') {
      return {
        sindhi: '',
        hindi: '',
        confidence: 0,
        error: `Anthropic requires API Key authentication, but ${authType} is configured.`,
      }
    }

    const result = await transliterateToSindhi(
      englishName,
      context,
      credential,
      provider,
      authType
    )
    return result
  } catch (err: any) {
    return {
      sindhi: '',
      hindi: '',
      confidence: 0,
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
