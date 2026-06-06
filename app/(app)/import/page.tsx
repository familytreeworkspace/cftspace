import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImportWizard from './_components/ImportWizard'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role check — only chief and admin
  const { data: profile } = await supabase
    .from('users')
    .select('role, caste_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch sub_castes (admin: their caste only; chief: all)
  const query = supabase
    .from('sub_castes')
    .select('id, name, caste_id')
    .order('name')

  const { data: subCastes } = profile.role === 'admin' && profile.caste_id
    ? await query.eq('caste_id', profile.caste_id)
    : await query

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Import wizard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bring records into CFTSpace in 5 guided steps.
        </p>
      </div>

      {/* Import wizard content */}
      <ImportWizard subCastes={subCastes ?? []} />
    </div>
  )
}
