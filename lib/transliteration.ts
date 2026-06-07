// Shared API call — sends prompt, returns raw response text
async function callAIRaw(
  prompt: string,
  credential: string,
  provider: string,
  maxTokens: number,
): Promise<string> {
  const key = credential || process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error(`${provider} credential not configured.`)

  const p = provider.toLowerCase()

  if (p.includes('openai') || p.includes('gpt')) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})) as any; throw new Error(`OpenAI ${res.status}: ${e?.error?.message || res.statusText}`) }
    return ((await res.json()) as any).choices?.[0]?.message?.content || ''

  } else if (p.includes('gemini')) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})) as any; throw new Error(`Gemini ${res.status}: ${e?.error?.message || res.statusText}`) }
    return ((await res.json()) as any).candidates?.[0]?.content?.parts?.[0]?.text || ''

  } else {
    // Anthropic (default)
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})) as any; throw new Error(`Anthropic ${res.status}: ${e?.error?.message || res.statusText}`) }
    return ((await res.json()) as any).content?.[0]?.text || ''
  }
}

// ── Minimal batch transliteration for Directory ───────────────────────────────
// All N words → ONE API call. Minimal prompt. Compact JSON response.
// Tokens used: ~50 prompt overhead + ~15 per word (vs 150 prompt + 30 output per word per call)
export async function transliterateDirectoryBatch(
  words: string[],
  sourceLang: 'sindhi' | 'english' | 'hindi',
  credential: string,
  provider: string = 'anthropic',
): Promise<{ word: string; english: string; hindi: string; sindhi: string }[]> {
  if (!words.length) return []

  const langName = sourceLang === 'sindhi' ? 'Sindhi' : sourceLang === 'hindi' ? 'Hindi' : 'English'

  // Ultra-compact prompt — only what AI needs
  const prompt = `Transliterate each ${langName} name. Return ONLY a JSON array, no other text.
Input: ${JSON.stringify(words)}
Output: [{"e":"English","h":"Hindi","s":"Sindhi"}, ...]`

  // Hindi/Sindhi scripts are ~3–4 chars per token; 40 tokens per word is safe
  const maxTokens = Math.max(300, words.length * 40)

  const raw = await callAIRaw(prompt, credential, provider, maxTokens)

  // Robust parser: try full array first, fall back to extracting individual objects
  let parsed: { e?: string; h?: string; s?: string }[] = []
  const arrMatch = raw.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try {
      parsed = JSON.parse(arrMatch[0])
    } catch {
      // Array may be truncated — extract individual objects instead
      const objs = [...raw.matchAll(/\{[^{}]*\}/g)]
      parsed = objs.map(m => { try { return JSON.parse(m[0]) } catch { return {} } })
    }
  } else {
    // No array brackets — try extracting individual objects
    const objs = [...raw.matchAll(/\{[^{}]*\}/g)]
    parsed = objs.map(m => { try { return JSON.parse(m[0]) } catch { return {} } })
  }

  return words.map((word, i) => ({
    word,
    english: parsed[i]?.e || '',
    hindi:   parsed[i]?.h || '',
    sindhi:  parsed[i]?.s || (sourceLang === 'sindhi' ? word : ''),
  }))
}

// ── Minimal single-entry transliteration ─────────────────────────────────────
export async function transliterateSingleMinimal(
  word: string,
  sourceLang: 'sindhi' | 'english' | 'hindi',
  credential: string,
  provider: string = 'anthropic',
): Promise<{ english: string; hindi: string; sindhi: string }> {
  const langName = sourceLang === 'sindhi' ? 'Sindhi' : sourceLang === 'hindi' ? 'Hindi' : 'English'
  const prompt = `Transliterate this ${langName} name. Return ONLY JSON, no other text.
"${word}"
{"e":"English","h":"Hindi","s":"Sindhi"}`

  // 80 tokens: enough for {"e":"...","h":"...","s":"..."} even with long names
  const raw = await callAIRaw(prompt, credential, provider, 80)
  // Use [\s\S] to handle multiline responses; match outermost braces
  const m = raw.match(/\{[\s\S]*?\}/)
  if (!m) throw new Error('Could not parse AI response')
  const r = JSON.parse(m[0])
  return {
    english: r.e || '',
    hindi:   r.h || '',
    sindhi:  r.s || (sourceLang === 'sindhi' ? word : ''),
  }
}

// Shared legacy wrapper (used by transliterateUniversal and transliterateToSindhi)
async function callAI(
  prompt: string,
  credential?: string,
  provider: string = 'anthropic',
): Promise<{ sindhi: string; english: string; hindi: string; confidence: number }> {
  const key = credential || process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error(
      `${provider} credential not configured. Add it in Settings → AI Service Credentials.`
    )
  }
  const raw = await callAIRaw(prompt, key, provider, 250)

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse AI response')
  const result = JSON.parse(jsonMatch[0])

  return {
    sindhi:   result.sindhi   || '',
    english:  result.english  || '',
    hindi:    result.hindi    || '',
    confidence: Math.min(100, Math.max(0, result.confidence || 50)),
  }
}

// Universal transliterator — any source language direction
export async function transliterateUniversal(
  sourceText: string,
  sourceLang: 'sindhi' | 'english' | 'hindi',
  credential?: string,
  provider: string = 'anthropic',
): Promise<{ sindhi: string; english: string; hindi: string; confidence: number }> {
  if (!sourceText?.trim()) {
    return { sindhi: '', english: '', hindi: '', confidence: 0 }
  }

  const langLabel: Record<string, string> = {
    sindhi:  'Sindhi (in Perso-Arabic script سنڌي)',
    english: 'English (Roman script)',
    hindi:   'Hindi (in Devanagari script हिंदी)',
  }

  const prompt = `You are an expert in transliterating proper names between Sindhi, English, and Hindi.

Given a name written in ${langLabel[sourceLang]}, produce all three forms:
1. sindhi — Sindhi in Perso-Arabic script (سنڌي)
2. english — English in Roman script
3. hindi — Hindi in Devanagari script (हिंदी)
4. confidence — your confidence 0–100

If the source is already in one of the three scripts, return it unchanged for that field.

Source name (${langLabel[sourceLang]}): "${sourceText}"

Respond ONLY in this JSON format, no other text:
{
  "sindhi": "سنڌي form",
  "english": "English form",
  "hindi": "हिंदी form",
  "confidence": 80
}`

  return callAI(prompt, credential, provider)
}

// Legacy: English → Sindhi + Hindi (kept for backward compatibility)
export async function transliterateToSindhi(
  englishName: string,
  context?: string,
  credential?: string,
  provider: string = 'anthropic',
  authType: string = 'api_key'
): Promise<{ sindhi: string; hindi: string; confidence: number }> {
  if (!englishName || englishName.trim().length === 0) {
    return { sindhi: '', hindi: '', confidence: 0 }
  }

  const prompt = `You are an expert in transliterating English Sindhi names to Sindhi script and Hindi script.

Given an English name, provide:
1. Sindhi transliteration (in Sindhi/Perso-Arabic script: سنڌي)
2. Hindi transliteration (in Devanagari script: हिंदी)
3. Confidence score (0-100) - how confident you are about the transliteration

${context ? `Additional context: ${context}` : ''}

English name to transliterate: "${englishName}"

Respond ONLY in this JSON format, no other text:
{
  "sindhi": "سنڌي transliteration here",
  "hindi": "hindi transliteration here",
  "confidence": 85
}`

  try {
    const result = await callAI(prompt, credential, provider)
    return { sindhi: result.sindhi, hindi: result.hindi, confidence: result.confidence }
  } catch (error: any) {
    throw error
  }
}

export async function transliterateBatch(
  names: { english: string; context?: string }[],
  credential?: string,
  provider: string = 'anthropic',
  authType: string = 'api_key'
): Promise<
  {
    english: string
    sindhi: string
    hindi: string
    confidence: number
  }[]
> {
  const results = await Promise.all(
    names.map(async ({ english, context }) => {
      const trans = await transliterateToSindhi(
        english,
        context,
        credential,
        provider,
        authType
      )
      return {
        english,
        sindhi: trans.sindhi,
        hindi: trans.hindi,
        confidence: trans.confidence,
      }
    })
  )

  return results
}
