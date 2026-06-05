'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Locale } from '@/i18n/request'
import { locales } from '@/i18n/request'

export async function setLocale(locale: Locale): Promise<void> {
  if (!(locales as string[]).includes(locale)) return

  const cookieStore = await cookies()
  cookieStore.set('locale', locale, {
    path:     '/',
    maxAge:   60 * 60 * 24 * 365,   // 1 year
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
  })

  revalidatePath('/', 'layout')
}
