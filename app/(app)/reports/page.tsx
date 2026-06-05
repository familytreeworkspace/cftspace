import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './_components/ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, caste_id').eq('id', user.id).single()

  if (!profile || !['chief', 'admin', 'verifier'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const scQuery = supabase.from('sub_castes').select('id, name').order('name')
  const { data: subCastes } = profile.role === 'admin' && profile.caste_id
    ? await scQuery.eq('caste_id', profile.caste_id)
    : await scQuery

  const { data: villages } = await supabase
    .from('villages').select('id, name').order('name')

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate & export community insights.</p>
      </div>
      <ReportsClient subCastes={subCastes ?? []} villages={villages ?? []} />
    </div>
  )
}
