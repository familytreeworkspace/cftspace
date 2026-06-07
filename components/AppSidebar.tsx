'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, Network, Upload,
  FileBarChart, UserCog, BookOpen, Inbox,
  TreePine, ChevronLeft, ChevronRight, Layers, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

export default function AppSidebar({ userRole, autoCollapse }: { userRole?: string; autoCollapse?: boolean }) {
  const pathname  = usePathname()
  const t         = useTranslations('nav')
  const [collapsed, setCollapsed] = useState(autoCollapse ?? false)

  const NAV_MAIN = [
    { href: '/dashboard',  icon: LayoutDashboard, label: t('dashboard') },
    { href: '/households', icon: Users,            label: t('households') },
    { href: '/tree',       icon: Network,          label: t('tree') },
    { href: '/import',     icon: Upload,           label: t('import') },
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

  useEffect(() => {
    setCollapsed(autoCollapse ?? false)
  }, [autoCollapse])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full transition-all duration-300',
        'bg-sidebar border-r border-sidebar-border',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-sidebar-border">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg gold-gradient text-gold-foreground shadow">
          <TreePine className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">CFTSpace</div>
            <div className="truncate text-xs text-sidebar-foreground/60">Heritage Edition</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        <NavGroup label="Main" collapsed={collapsed}>
          {NAV_MAIN.map(item => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
          ))}
        </NavGroup>

        <NavGroup label="Administration" collapsed={collapsed}>
          {NAV_ADMIN.map(item => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
          ))}
        </NavGroup>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50">v1.0 · Heritage Edition</p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}

function NavGroup({
  label, collapsed, children,
}: {
  label: string; collapsed: boolean; children: React.ReactNode
}) {
  return (
    <div>
      {!collapsed && (
        <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          {label}
        </p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function NavItem({
  href, icon: Icon, label, active, collapsed,
}: {
  href: string; icon: React.ElementType; label: string; active: boolean; collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
