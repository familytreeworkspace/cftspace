import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TreeExplorer from './_components/TreeExplorer'

export default async function TreePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, caste_id, name').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const canEdit = ['chief', 'admin'].includes(profile.role)
  const isViewer = profile.role === 'viewer'

  const scQuery = supabase
    .from('sub_castes')
    .select('id, name, name_sindhi')
    .order('name')

  const { data: subCastes } = profile.role === 'admin' && profile.caste_id
    ? await scQuery.eq('caste_id', profile.caste_id)
    : await scQuery

  return (
    <TreeExplorer
      subCastes={subCastes ?? []}
      canEdit={canEdit}
      isViewer={isViewer}
      userName={profile.name ?? user.email ?? ''}
    />
  )
}
