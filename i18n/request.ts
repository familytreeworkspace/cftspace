import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export type Locale = 'en' | 'sd' | 'hi'
export const locales: Locale[] = ['en', 'sd', 'hi']
export const defaultLocale: Locale = 'en'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value ?? defaultLocale
  const locale: Locale = (locales as string[]).includes(raw) ? (raw as Locale) : defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
