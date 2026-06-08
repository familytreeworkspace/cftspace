import type { Metadata } from 'next'
import { Inter, Lora, Amiri } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import TitleMarquee from './TitleMarquee'

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
  title: 'Community Family Tree Space',
  description: 'CFTSpace is a comprehensive Community Family Tree Platform dedicated to bringing entire community histories and family roots to life on a single, secure platform. Designed to bridge generations, it empowers castes and communities to seamlessly manage households, track member relations, and preserve their heritage across various sub-castes. With intuitive support for both graphical and text-based interactive family trees, CFTSpace makes exploring and linking family records beautifully simple. Designed & Developed by: Mahadev S/O Dr. Harchand Rai Makwana Suthar.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Community Family Tree Space',
    statusBarStyle: 'default',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1e3a5f',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const isRTL = locale === 'sd'

  return (
    <html
      lang={locale}
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`${inter.variable} ${lora.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TitleMarquee />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
