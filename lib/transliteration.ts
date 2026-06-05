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

  try {
    const key = credential || process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error(
        `${provider} credential not configured. Add it in Settings → AI Service Credentials.`
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `You are an expert in transliterating English Sindhi names to Sindhi script and Hindi script.

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
}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json()
    const responseText = data.content?.[0]?.text || ''

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse AI response')
    }

    const result = JSON.parse(jsonMatch[0])

    return {
      sindhi: result.sindhi || '',
      hindi: result.hindi || '',
      confidence: Math.min(100, Math.max(0, result.confidence || 50)),
    }
  } catch (error) {
    console.error('Transliteration error:', error)
    return {
      sindhi: '',
      hindi: '',
      confidence: 0,
    }
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
