import type { Metadata } from 'next'
import { Inter, Lora, Amiri } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const amiri = Amiri({
  variable: '--font-amiri',
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CFTSpace — Community Family Tree',
  description: 'Community Family Tree Platform — manage, view and link family records',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CFTSpace',
  },
  formatDetection: { telephone: false },
  themeColor: '#3a5f3a',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const locale   = await getLocale()
    const messages = await getMessages()
    const isRTL    = locale === 'sd'

    return (
      <html
        lang={locale}
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`${inter.variable} ${lora.variable} ${amiri.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    )
  } catch (error) {
    // Fallback for routes without locale context
    return (
      <html
        lang="en"
        dir="ltr"
        className={`${inter.variable} ${lora.variable} ${amiri.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <NextIntlClientProvider messages={{}}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    )
  }
}
