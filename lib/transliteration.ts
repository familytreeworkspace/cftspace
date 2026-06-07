// Shared API call — all providers return { sindhi, english, hindi, confidence }
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

  const p = provider.toLowerCase()
  let responseText = ''

  if (p.includes('openai') || p.includes('gpt')) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as any
      throw new Error(`OpenAI API error ${response.status}: ${err?.error?.message || response.statusText}`)
    }
    const data: any = await response.json()
    responseText = data.choices?.[0]?.message?.content || ''

  } else if (p.includes('gemini')) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as any
      throw new Error(`Gemini API error ${response.status}: ${err?.error?.message || response.statusText}`)
    }
    const data: any = await response.json()
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  } else {
    // Anthropic (default)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as any
      throw new Error(`Anthropic API error ${response.status}: ${err?.error?.message || response.statusText}`)
    }
    const data: any = await response.json()
    responseText = data.content?.[0]?.text || ''
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
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
