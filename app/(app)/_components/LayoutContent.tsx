'use client'

import AppSidebar from '@/components/AppSidebar'
import AppHeader from '@/components/AppHeader'
import type { Locale } from '@/i18n/request'

export default function LayoutContent({
  children,
  userName,
  userRole,
  pendingCorrections,
  locale,
}: {
  children: React.ReactNode
  userName: string
  userRole?: string
  pendingCorrections: number
  locale: Locale
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader
          userName={userName}
          userRole={userRole}
          pendingCorrections={pendingCorrections}
          locale={locale}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
