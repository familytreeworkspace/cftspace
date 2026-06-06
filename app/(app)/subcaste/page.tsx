import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubCasteManager from './_components/SubCasteManager'

export default async function SubCastePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, caste_id').eq('id', user.id).single()

  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Chief sees all castes; admin only needs their own caste
  const { data: castes } = await supabase
    .from('castes').select('id, name').order('name')

  // Resolve admin's caste name
  const adminCaste = profile.role === 'admin' && profile.caste_id
    ? castes?.find(c => c.id === profile.caste_id) ?? null
    : null

  const scQuery = supabase
    .from('sub_castes')
    .select('id, name, name_sindhi, name_hindi, caste_id, households(count)')
    .order('name')

  const { data: subCastes } = profile.role === 'admin' && profile.caste_id
    ? await scQuery.eq('caste_id', profile.caste_id)
    : await scQuery

  const subCastesWithCount = (subCastes ?? []).map(s => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    household_count: (s.households as any)?.[0]?.count ?? 0,
  }))

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Sub Caste Management</h1>
      </div>
      <div className="mb-4 bg-accent border border-border rounded-lg px-4 py-3 text-sm text-accent-foreground">
        Sub Caste must be created before importing data. Each import file is linked to one sub caste.
      </div>
      <div className="bg-card rounded-xl border border-border p-6">
        <SubCasteManager
        castes={castes ?? []}
        subCastes={subCastesWithCount}
        userRole={profile.role}
        adminCasteId={profile.caste_id ?? null}
        adminCasteName={adminCaste?.name ?? null}
      />
      </div>
    </div>
  )
}
