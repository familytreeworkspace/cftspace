import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsersClient from './_components/UsersClient'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, caste_id').eq('id', user.id).single()

  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  let query = supabase
    .from('users')
    .select('id, name, email, role, caste_id, is_active, created_at')
    .order('created_at')

  // Admin cannot see Chief users
  if (profile.role === 'admin') {
    query = query.neq('role', 'chief')
  }

  const { data: users } = await query

  const { data: castes } = await supabase
    .from('castes').select('id, name').order('name')

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <span className="text-sm text-muted-foreground">{users?.length ?? 0} users</span>
      </div>
      <UsersClient
        users={(users ?? []) as Parameters<typeof UsersClient>[0]['users']}
        castes={castes ?? []}
        currentUserId={user.id}
        isChief={profile.role === 'chief'}
        isAdmin={profile.role === 'admin'}
        adminCasteId={profile.role === 'admin' && profile.caste_id ? profile.caste_id : undefined}
      />
    </div>
  )
}
