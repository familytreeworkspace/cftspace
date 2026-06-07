import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import LayoutContent from './_components/LayoutContent'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { count: pendingCorrections }, locale] = await Promise.all([
    supabase.from('users').select('name, role').eq('id', user.id).single(),
    supabase.from('correction_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    getLocale(),
  ])

  return (
    <LayoutContent
      userName={profile?.name ?? user.email ?? ''}
      userRole={profile?.role}
      pendingCorrections={pendingCorrections ?? 0}
      locale={locale as any}
    >
      {children}
    </LayoutContent>
  )
}
