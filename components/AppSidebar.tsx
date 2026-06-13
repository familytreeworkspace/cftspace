'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, Network, Upload,
  FileBarChart, UserCog, BookOpen, Inbox,
  TreePine, X, Layers, Crown, FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AppSidebar({
  userRole, open, onClose,
}: {
  userRole?: string
  open: boolean
  onClose: () => void
}) {
  const pathname  = usePathname()
  const t         = useTranslations('nav')

  const NAV_MAIN = [
    { href: '/dashboard',  icon: LayoutDashboard, label: t('dashboard') },
    { href: '/households', icon: Users,            label: t('households') },
    { href: '/tree',       icon: Network,          label: t('tree') },
    { href: '/import',     icon: Upload,           label: t('import') },
    { href: '/convert',    icon: FileSpreadsheet,  label: 'Chart Convert' },
    { href: '/reports',    icon: FileBarChart,     label: t('reports') },
  ]

  const NAV_ADMIN_CHIEF = [
    { href: '/users',       icon: UserCog,  label: t('users') },
    { href: '/caste',       icon: Crown,    label: 'Caste' },
    { href: '/subcaste',    icon: Layers,   label: t('subCaste') },
    { href: '/directory',   icon: BookOpen, label: t('directory') },
    { href: '/corrections', icon: Inbox,    label: t('corrections') },
  ]

  const NAV_ADMIN_ONLY = [
    { href: '/users',       icon: UserCog,  label: t('users') },
    { href: '/subcaste',    icon: Layers,   label: t('subCaste') },
    { href: '/directory',   icon: BookOpen, label: t('directory') },
    { href: '/corrections', icon: Inbox,    label: t('corrections') },
  ]

  const NAV_ADMIN = userRole === 'chief' ? NAV_ADMIN_CHIEF : NAV_ADMIN_ONLY

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Slide-in drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 max-w-[82vw] flex-col',
          'bg-sidebar border-r border-sidebar-border shadow-2xl',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + close */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-sidebar-border">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg gold-gradient text-gold-foreground shadow">
            <TreePine className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">CFTSpace</div>
            <div className="truncate text-xs text-sidebar-foreground/60">Heritage Edition</div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
          <NavGroup label="Main">
            {NAV_MAIN.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
            ))}
          </NavGroup>

          <NavGroup label="Administration">
            {NAV_ADMIN.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
            ))}
          </NavGroup>
        </nav>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50">v1.0 · Heritage Edition</p>
        </div>
      </aside>
    </>
  )
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function NavItem({
  href, icon: Icon, label, active, onNavigate,
}: {
  href: string; icon: React.ElementType; label: string; active: boolean; onNavigate: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
