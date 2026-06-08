'use client'

import Link from 'next/link'
import { Bell, Globe, User, LogOut, Settings, LayoutGrid } from 'lucide-react'
import { useTransition, useState } from 'react'
import { setLocale } from '@/app/actions/locale'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/request'

const LANGS: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'sd', label: 'سنڌي' },
  { code: 'hi', label: 'हिंदी' },
]

export default function AppHeader({
  userName,
  userRole,
  pendingCorrections = 0,
  locale,
  onMenuClick,
}: {
  userName?: string
  userRole?: string
  pendingCorrections?: number
  locale: Locale
  onMenuClick?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [langOpen, setLangOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  function handleLocale(code: Locale) {
    setLangOpen(false)
    startTransition(() => setLocale(code))
  }

  const currentLang = LANGS.find(l => l.code === locale)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/80 backdrop-blur px-3 sm:px-4 no-print">
      {/* Menu — slides the sidebar open */}
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-gold/15 text-gold hover:bg-gold/25 active:scale-95 transition-all"
        style={{ color: '#f5b400' }}
      >
        <LayoutGrid className="h-5 w-5" fill="currentColor" strokeWidth={1.5} />
      </button>

      {/* Left — page title slot (empty, sidebar shows nav) */}
      <div className="flex-1" />

      {/* Language picker */}
      <div className="relative">
        <button
          onClick={() => { setLangOpen(o => !o); setUserOpen(false) }}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            isPending && 'opacity-50'
          )}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang?.label}</span>
        </button>
        {langOpen && (
          <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border bg-card shadow-lg py-1 z-50">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => handleLocale(l.code)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                {l.label}
                {locale === l.code && <span className="text-primary">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <button className="relative flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
        <Bell className="h-4 w-4" />
        {pendingCorrections > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-gold-foreground text-[10px] font-bold">
            {pendingCorrections > 9 ? '9+' : pendingCorrections}
          </span>
        )}
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => { setUserOpen(o => !o); setLangOpen(false) }}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
        >
          <div className="grid h-7 w-7 place-items-center rounded-full heritage-gradient text-primary-foreground">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium text-foreground leading-tight">{userName ?? 'User'}</div>
            <div className="text-[10px] text-muted-foreground capitalize">{userRole ?? ''}</div>
          </div>
        </button>

        {userOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border bg-card shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-medium">{userName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{userRole}</p>
            </div>
            <Link href="/settings" onClick={() => setUserOpen(false)}>
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer">
                <Settings className="h-3.5 w-3.5" />
                ⚙️ Settings
              </div>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Close dropdowns on outside click */}
      {(langOpen || userOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setLangOpen(false); setUserOpen(false) }}
        />
      )}
    </header>
  )
}
