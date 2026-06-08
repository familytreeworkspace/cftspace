'use client'

import { useState } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      {/* Sidebar is an overlay drawer — hidden until the menu icon is tapped */}
      <AppSidebar userRole={userRole} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AppHeader
          userName={userName}
          userRole={userRole}
          pendingCorrections={pendingCorrections}
          locale={locale}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className={isTreePage
          ? 'flex-1 overflow-hidden'
          : 'flex-1 overflow-y-auto p-3 sm:p-6'
        }>
          {children}
        </main>
      </div>
    </div>
  )
}
