'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { setLocale } from '@/app/actions/locale'
import type { Locale } from '@/i18n/request'

const LANGS: { code: Locale; label: string; script: string }[] = [
  { code: 'en', label: 'EN', script: 'English' },
  { code: 'sd', label: 'سنڌي', script: 'Sindhi' },
  { code: 'hi', label: 'हिं', script: 'Hindi' },
]

export default function LanguageToggle() {
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  function handleChange(code: Locale) {
    if (code === locale) return
    startTransition(() => setLocale(code))
  }

  return (
    <div className={`flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 ${isPending ? 'opacity-60' : ''}`}>
      {LANGS.map(lang => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          disabled={isPending}
          title={lang.script}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            locale === lang.code
              ? 'bg-white text-blue-800 shadow-sm'
              : 'text-blue-200 hover:text-white'
          }`}
          dir={lang.code === 'sd' ? 'rtl' : 'ltr'}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
