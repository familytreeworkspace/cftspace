import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import HouseholdListClient from './_components/HouseholdListClient'

export default async function HouseholdsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, caste_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch sub_castes
  const scQuery = supabase.from('sub_castes').select('id, name, caste_id').order('name')
  const { data: subCastes } = profile.role === 'admin' && profile.caste_id
    ? await scQuery.eq('caste_id', profile.caste_id)
    : await scQuery

  // Fetch households with member count and village info
  const { data: households } = await supabase
    .from('households')
    .select(`
      id, ghar_number, head_name, head_gender,
      sub_caste_id, education, profession, current_address,
      village_id, villages(name),
      members(count)
    `)
    .eq('is_active', true)
    .order('ghar_number')

  const householdsWithCount = (households ?? []).map(h => ({
    ...h,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    member_count: (h.members as any)?.[0]?.count ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    village_name: (h.villages as any)?.name ?? null,
  }))

  // Count households per sub-caste
  const scCounts = new Map<string, number>()
  householdsWithCount.forEach(h => {
    if (h.sub_caste_id) {
      scCounts.set(h.sub_caste_id, (scCounts.get(h.sub_caste_id) ?? 0) + 1)
    }
  })
  const totalCount = householdsWithCount.length

  const subCastesWithCount = (subCastes ?? []).map(sc => ({
    ...sc,
    count: scCounts.get(sc.id) ?? 0,
  }))

  const canAdd = ['chief', 'admin', 'verifier'].includes(profile.role)
  const t = await getTranslations('household')

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
      </div>
      <HouseholdListClient
        households={householdsWithCount}
        subCastes={subCastesWithCount}
        totalCount={totalCount}
        canAdd={canAdd}
      />
    </div>
  )
}
