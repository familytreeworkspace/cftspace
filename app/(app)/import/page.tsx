import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ImportWizard from './_components/ImportWizard'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const t = await getTranslations('import')

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

  // Fetch latest import log per sub_caste + import_type for reimport detection
  const { data: importLogs } = await supabase
    .from('import_logs')
    .select('sub_caste_id, import_type, created_at')
    .order('created_at', { ascending: false })

  // Group: sub_caste_id → import_type → latest timestamp
  const importStatus: Record<string, Record<string, string>> = {}
  for (const log of importLogs ?? []) {
    const scId = log.sub_caste_id ?? ''
    const iType = log.import_type ?? ''
    const iDate = log.created_at ?? ''
    if (!scId || !iType) continue
    if (!importStatus[scId]) importStatus[scId] = {}
    if (!importStatus[scId][iType]) {
      importStatus[scId][iType] = iDate
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Import wizard content */}
      <ImportWizard subCastes={subCastes ?? []} importStatus={importStatus} />
    </div>
  )
}
