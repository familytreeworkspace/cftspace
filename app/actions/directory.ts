'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { transliterateDirectoryBatch, transliterateSingleMinimal } from '@/lib/transliteration'

export interface DirectoryEntry {
  id: string
  sindhi_word: string
  english_word: string | null
  hindi_word: string | null
  category: string
  created_at: string
  updated_at: string
}

// Tracks which DB records have blank fields — computed during Sync, consumed by Backfill
export interface BackfillTarget {
  table: 'households' | 'members'
  id: string
  sindhi_name: string
  blank_fields: string[]
}

function decryptCredential(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}

// Detect if text contains Sindhi/Arabic Unicode characters
function isSindhiScript(text: string): boolean {
  return /[؀-ۿݐ-ݿ]/.test(text)
}

// ── Auto-insert ──────────────────────────────────────────────────────────────

export async function autoInsertIntoDirectory(
  name: string,
  category: string = 'name'
): Promise<void> {
  if (!name?.trim()) return
  try {
    const supabase = await createClient()
    const word = name.trim()
    await supabase.from('directory').upsert(
      {
        sindhi_word:  word,
        english_word: isSindhiScript(word) ? null : word,
        category,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sindhi_word', ignoreDuplicates: true }
    )
  } catch {
    // Never block the calling action
  }
}

export async function batchInsertIntoDirectory(
  names: string[],
  category: string = 'name'
): Promise<void> {
  const unique = [...new Set(names.map(n => n.trim()).filter(Boolean))]
  if (!unique.length) return

  try {
    const supabase = await createClient()
    const rows = unique.map(word => ({
      sindhi_word:  word,
      english_word: isSindhiScript(word) ? null : word,
      hindi_word:   null as string | null,
      category,
      updated_at: new Date().toISOString(),
    }))
    await supabase.from('directory').upsert(rows, {
      onConflict: 'sindhi_word',
      ignoreDuplicates: true,
    })
  } catch {
    // Silent
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getDirectoryEntries(filter?: {
  category?: string
  hasBlank?: boolean
}): Promise<DirectoryEntry[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('directory')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter?.category) query = query.eq('category', filter.category)
    if (filter?.hasBlank)  query = (query as any).or('english_word.is.null,hindi_word.is.null')

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as DirectoryEntry[]
  } catch {
    return []
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function updateDirectoryEntry(
  id: string,
  updates: { english_word?: string | null; hindi_word?: string | null; category?: string }
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const clean: Partial<{ english_word: string | null; hindi_word: string | null; category: string; updated_at: string }> = {
      updated_at: new Date().toISOString(),
    }
    if ('english_word' in updates) clean.english_word = updates.english_word?.trim() || null
    if ('hindi_word'   in updates) clean.hindi_word   = updates.hindi_word?.trim()   || null
    if ('category'     in updates) clean.category     = updates.category

    const { error } = await supabase.from('directory').update(clean).eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/directory')
    return {}
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteDirectoryEntry(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('directory').delete().eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/directory')
    return {}
  } catch (err: any) {
    return { error: err.message }
  }
}

// ── Bulk AI Convert ──────────────────────────────────────────────────────────

async function getAICredential(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: credentials } = await (supabase
    .from('ai_credentials' as any)
    .select('provider, auth_type, credential_encrypted')
    .eq('user_id', userId)
    .eq('is_active', true)) as any

  const apiKeyCred = credentials?.find((c: any) => c.auth_type === 'api_key')
  if (!apiKeyCred) return null
  return {
    credential: decryptCredential(apiKeyCred.credential_encrypted),
    provider: apiKeyCred.provider as string,
  }
}

export async function bulkAIConvert(limit: number = 20): Promise<{
  converted: number
  errors: string[]
  updatedEntries: { id: string; english_word: string | null; hindi_word: string | null }[]
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { converted: 0, errors: ['Not authenticated'], updatedEntries: [] }

    const ai = await getAICredential(supabase, user.id)
    if (!ai) return { converted: 0, errors: ['No AI API key found. Add one in Settings.'], updatedEntries: [] }

    const { data: entries, error: fetchErr } = await (supabase
      .from('directory')
      .select('id, sindhi_word, english_word, hindi_word, category')
      .or('english_word.is.null,hindi_word.is.null')
      .limit(limit)) as any

    if (fetchErr) return { converted: 0, errors: [fetchErr.message], updatedEntries: [] }
    if (!entries?.length) return { converted: 0, errors: [], updatedEntries: [] }

    const entryList = entries as any[]
    const words = entryList.map((e: any) => e.sindhi_word as string)
    // Detect dominant script from first word (all entries in a batch are same script)
    const sourceLang = isSindhiScript(words[0]) ? 'sindhi' : 'english'

    // ONE API call for all N words — minimal prompt, compact response
    let batchResults: { word: string; english: string; hindi: string; sindhi: string }[]
    const errors: string[] = []
    try {
      batchResults = await transliterateDirectoryBatch(words, sourceLang, ai.credential, ai.provider)
    } catch (err: any) {
      return { converted: 0, errors: [err.message], updatedEntries: [] }
    }

    let converted = 0
    const updatedEntries: { id: string; english_word: string | null; hindi_word: string | null }[] = []

    for (let i = 0; i < entryList.length; i++) {
      const entry  = entryList[i]
      const result = batchResults[i]
      if (!result) continue

      try {
        const upd: Partial<{ english_word: string | null; hindi_word: string | null; updated_at: string }> = {
          updated_at: new Date().toISOString(),
        }
        if (!entry.english_word && result.english) upd.english_word = result.english
        if (!entry.hindi_word   && result.hindi)   upd.hindi_word   = result.hindi

        if (Object.keys(upd).length > 1) {
          await supabase.from('directory').update(upd).eq('id', entry.id)
          converted++
          updatedEntries.push({
            id: entry.id,
            english_word: upd.english_word ?? entry.english_word,
            hindi_word:   upd.hindi_word   ?? entry.hindi_word,
          })
        }
      } catch (err: any) {
        errors.push(`"${entry.sindhi_word}": ${err.message}`)
      }
    }

    revalidatePath('/directory')
    return { converted, errors, updatedEntries }
  } catch (err: any) {
    return { converted: 0, errors: [err.message], updatedEntries: [] }
  }
}

// Convert a single directory entry via AI
export async function convertSingleEntry(id: string): Promise<{
  english_word: string | null
  hindi_word: string | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { english_word: null, hindi_word: null, error: 'Not authenticated' }

    const ai = await getAICredential(supabase, user.id)
    if (!ai) return { english_word: null, hindi_word: null, error: 'No AI API key found. Add one in Settings.' }

    const { data: entry } = await supabase
      .from('directory')
      .select('sindhi_word, english_word, hindi_word')
      .eq('id', id)
      .single()

    if (!entry) return { english_word: null, hindi_word: null, error: 'Entry not found' }

    const sourceLang = isSindhiScript(entry.sindhi_word) ? 'sindhi' : 'english'
    // Minimal single-entry call — small prompt, max_tokens=40
    const result = await transliterateSingleMinimal(entry.sindhi_word, sourceLang, ai.credential, ai.provider)

    const upd: Partial<{ english_word: string | null; hindi_word: string | null; updated_at: string }> = {
      updated_at: new Date().toISOString(),
    }
    if (result.english) upd.english_word = result.english
    if (result.hindi)   upd.hindi_word   = result.hindi

    await supabase.from('directory').update(upd).eq('id', id)
    revalidatePath('/directory')

    return {
      english_word: upd.english_word ?? null,
      hindi_word:   upd.hindi_word   ?? null,
    }
  } catch (err: any) {
    return { english_word: null, hindi_word: null, error: err.message }
  }
}

// ── Auto-backfill ─────────────────────────────────────────────────────────────

export async function autoBackfill(targets?: BackfillTarget[]): Promise<{
  householdsUpdated: number
  membersUpdated: number
  errors: string[]
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { householdsUpdated: 0, membersUpdated: 0, errors: ['Not authenticated'] }

    const errors: string[] = []
    let householdsUpdated = 0
    let membersUpdated    = 0

    // Fetch ALL directory entries, filter in JS (avoids unreliable PostgREST .not.is.null syntax)
    const { data: allDirEntries, error: dirErr } = await supabase
      .from('directory')
      .select('sindhi_word, english_word, hindi_word')

    if (dirErr) return { householdsUpdated: 0, membersUpdated: 0, errors: [`Directory read error: ${dirErr.message}`] }

    // Only keep entries that have at least one translation filled
    const dirEntries = (allDirEntries ?? []).filter(e => e.english_word || e.hindi_word)
    if (!dirEntries.length) return { householdsUpdated: 0, membersUpdated: 0, errors: ['No translated entries found in Directory. Run AI Convert first.'] }

    // Build lookup: trim sindhi_word to handle any whitespace differences
    const lookup = new Map<string, { english: string | null; hindi: string | null }>()
    for (const e of dirEntries) {
      lookup.set(e.sindhi_word.trim(), { english: e.english_word, hindi: e.hindi_word })
    }

    // ── Targeted mode: use pre-computed list from Sync ────────────────────────
    if (targets && targets.length > 0) {
      for (const target of targets) {
        const entry = lookup.get(target.sindhi_name.trim())
        if (!entry) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const upd: Record<string, string | null> = {}
        for (const field of target.blank_fields) {
          if (field === 'head_name_sindhi' || field === 'name_sindhi') {
            upd[field] = target.sindhi_name
          } else if ((field === 'head_name_hindi' || field === 'name_hindi') && entry.hindi) {
            upd[field] = entry.hindi
          } else if ((field === 'head_name' || field === 'name') && entry.english) {
            upd[field] = entry.english
          }
        }

        if (Object.keys(upd).length === 0) continue

        const { error } = await (supabase.from(target.table) as any).update(upd).eq('id', target.id)
        if (error) errors.push(`${target.table} ${target.id}: ${error.message}`)
        else if (target.table === 'households') householdsUpdated++
        else membersUpdated++
      }

      revalidatePath('/directory')
      return { householdsUpdated, membersUpdated, errors }
    }

    // ── Fallback: full scan (when called without pre-computed targets) ────────

    // Households — fill head_name, head_name_sindhi, head_name_hindi
    const { data: households } = await supabase
      .from('households')
      .select('id, head_name, head_name_sindhi, head_name_hindi')

    for (const hh of households ?? []) {
      // Use any available name as lookup key — no script filter
      const key = hh.head_name_sindhi?.trim() || hh.head_name?.trim()
      if (!key) continue

      const entry = lookup.get(key)
      if (!entry) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upd: Record<string, string | null> = {}
      if (!hh.head_name_sindhi?.trim() && isSindhiScript(key)) upd.head_name_sindhi = key
      if (!hh.head_name_hindi?.trim() && entry.hindi) upd.head_name_hindi = entry.hindi
      if ((!hh.head_name?.trim() || isSindhiScript(hh.head_name)) && entry.english) upd.head_name = entry.english

      if (Object.keys(upd).length > 0) {
        const { error } = await (supabase.from('households') as any).update(upd).eq('id', hh.id)
        if (error) errors.push(`Household ${hh.id}: ${error.message}`)
        else householdsUpdated++
      }
    }

    // Members — fill name, name_sindhi, name_hindi
    const { data: members } = await supabase
      .from('members')
      .select('id, name, name_sindhi, name_hindi')

    for (const m of members ?? []) {
      const key = m.name_sindhi?.trim() || m.name?.trim()
      if (!key) continue

      const entry = lookup.get(key)
      if (!entry) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upd: Record<string, string | null> = {}
      if (!m.name_sindhi?.trim() && isSindhiScript(key)) upd.name_sindhi = key
      if (!m.name_hindi?.trim() && entry.hindi) upd.name_hindi = entry.hindi
      if ((!m.name?.trim() || isSindhiScript(m.name)) && entry.english) upd.name = entry.english

      if (Object.keys(upd).length > 0) {
        const { error } = await (supabase.from('members') as any).update(upd).eq('id', m.id)
        if (error) errors.push(`Member ${m.id}: ${error.message}`)
        else membersUpdated++
      }
    }

    revalidatePath('/directory')
    return { householdsUpdated, membersUpdated, errors }
  } catch (err: any) {
    return { householdsUpdated: 0, membersUpdated: 0, errors: [err.message] }
  }
}

// ── Sync from Database ────────────────────────────────────────────────────────

export async function syncFromDatabase(): Promise<{
  inserted: number
  skipped: number
  errors: string[]
  pendingBackfill: BackfillTarget[]
}> {
  const empty = { inserted: 0, skipped: 0, errors: [] as string[], pendingBackfill: [] as BackfillTarget[] }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...empty, errors: ['Not authenticated'] }

    // Load existing sindhi_words already in Directory
    const { data: existing, error: existErr } = await supabase
      .from('directory')
      .select('sindhi_word')

    if (existErr) {
      return {
        ...empty,
        errors: [`Directory table error: ${existErr.message}. Make sure you have run the SQL migration to create the directory table.`],
      }
    }

    const alreadyIn = new Set((existing ?? []).map(e => e.sindhi_word))
    const toInsert: { sindhi_word: string; english_word: string | null; hindi_word: null; category: string }[] = []
    const pendingBackfill: BackfillTarget[] = []

    // Households: select all name + translation columns to detect blanks in one pass
    const { data: households, error: hhErr } = await supabase
      .from('households')
      .select('id, head_name, head_name_sindhi, head_name_hindi')

    if (hhErr) return { ...empty, errors: [`Households query error: ${hhErr.message}`] }

    for (const hh of households ?? []) {
      // Use whatever name is available — English or Sindhi, no script filter
      const key = hh.head_name_sindhi?.trim() || hh.head_name?.trim()
      if (!key) continue

      if (!alreadyIn.has(key)) {
        alreadyIn.add(key)
        toInsert.push({
          sindhi_word:  key,
          // If already English, pre-fill english_word so AI convert is not needed
          english_word: isSindhiScript(key) ? null : key,
          hindi_word:   null,
          category: 'name',
        })
      }

      // Track which fields are blank — backfill will fill these
      const blanks: string[] = []
      if (!hh.head_name_sindhi?.trim())  blanks.push('head_name_sindhi')
      if (!hh.head_name_hindi?.trim())   blanks.push('head_name_hindi')
      // head_name needs update only if blank or still in Sindhi script
      if (!hh.head_name?.trim() || isSindhiScript(hh.head_name)) blanks.push('head_name')
      if (blanks.length) pendingBackfill.push({ table: 'households', id: hh.id, sindhi_name: key, blank_fields: blanks })
    }

    // Sub castes — store all names regardless of script
    const { data: subCastes } = await supabase
      .from('sub_castes')
      .select('name, name_sindhi, name_hindi')

    for (const sc of subCastes ?? []) {
      const key = sc.name_sindhi?.trim() || sc.name?.trim()
      if (!key) continue

      if (!alreadyIn.has(key)) {
        alreadyIn.add(key)
        toInsert.push({
          sindhi_word:  key,
          english_word: isSindhiScript(key) ? null : key,
          hindi_word:   null,
          category: 'sub_caste',
        })
      }
    }

    // Members — all names, no script filter
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('id, name, name_sindhi, name_hindi')

    if (memErr) return { ...empty, errors: [`Members query error: ${memErr.message}`] }

    for (const m of members ?? []) {
      const key = m.name_sindhi?.trim() || m.name?.trim()
      if (!key) continue

      if (!alreadyIn.has(key)) {
        alreadyIn.add(key)
        toInsert.push({
          sindhi_word:  key,
          english_word: isSindhiScript(key) ? null : key,
          hindi_word:   null,
          category: 'name',
        })
      }

      const blanks: string[] = []
      if (!m.name_sindhi?.trim())  blanks.push('name_sindhi')
      if (!m.name_hindi?.trim())   blanks.push('name_hindi')
      if (!m.name?.trim() || isSindhiScript(m.name)) blanks.push('name')
      if (blanks.length) pendingBackfill.push({ table: 'members', id: m.id, sindhi_name: key, blank_fields: blanks })
    }

    if (!toInsert.length) {
      return { inserted: 0, skipped: existing?.length ?? 0, errors: [], pendingBackfill }
    }

    // Insert in chunks of 100
    const CHUNK = 100
    let inserted = 0
    const errors: string[] = []

    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK).map(r => ({
        ...r,
        updated_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('directory').upsert(chunk, {
        onConflict: 'sindhi_word',
        ignoreDuplicates: true,
      })
      if (error) errors.push(`Insert chunk ${i}–${i + CHUNK}: ${error.message}`)
      else inserted += chunk.length
    }

    revalidatePath('/directory')
    return { inserted, skipped: existing?.length ?? 0, errors, pendingBackfill }
  } catch (err: any) {
    return { ...empty, errors: [`Unexpected error: ${err.message}`] }
  }
}
