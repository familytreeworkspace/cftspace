import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import HouseholdForm from '../../_components/HouseholdForm'

export default async function EditHouseholdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, caste_id').eq('id', user.id).single()

  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    redirect(`/households/${id}`)
  }

  const { data: household } = await supabase
    .from('households')
    .select('id, sub_caste_id, ghar_number, head_name, head_gender, dob_year, education, profession, original_address, current_address')
    .eq('id', id)
    .single()

  if (!household) notFound()

  const scQuery = supabase.from('sub_castes').select('id, name').order('name')
  const { data: subCastes } = profile.role === 'admin' && profile.caste_id
    ? await scQuery.eq('caste_id', profile.caste_id)
    : await scQuery

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <div className="text-sm text-muted-foreground mb-1">
          <a href="/households" className="hover:text-primary">Households</a>
          {' / '}
          <a href={`/households/${id}`} className="hover:text-primary">{household.head_name}</a>
          {' / Edit'}
        </div>
        <h1 className="text-2xl font-bold text-foreground">Edit Household</h1>
      </div>
      <div className="bg-card rounded-xl border border-border p-8">
        <HouseholdForm subCastes={subCastes ?? []} household={household} />
      </div>
    </div>
  )
}
