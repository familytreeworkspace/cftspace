'use client'

import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const isTreePage = pathname.startsWith('/tree')

  // Viewer gets full-screen tree — no sidebar, no header
  if (userRole === 'viewer') {
    return (
      <div className="h-screen overflow-hidden bg-slate-50">
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar userRole={userRole} autoCollapse={isTreePage} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AppHeader
          userName={userName}
          userRole={userRole}
          pendingCorrections={pendingCorrections}
          locale={locale}
        />
        <main className={isTreePage
          ? 'flex-1 overflow-hidden'
          : 'flex-1 overflow-y-auto p-4 sm:p-6'
        }>
          {children}
        </main>
      </div>
    </div>
  )
}
