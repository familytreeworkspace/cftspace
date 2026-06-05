import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LayoutContent from './_components/LayoutContent'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const { count: pendingCorrections } = await supabase
    .from('correction_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <LayoutContent
      userName={profile?.name ?? user.email ?? ''}
      userRole={profile?.role}
      pendingCorrections={pendingCorrections ?? 0}
      locale="en"
    >
      {children}
    </LayoutContent>
  )
}
