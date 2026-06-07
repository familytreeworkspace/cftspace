import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCorrections } from '@/app/actions/corrections'
import CorrectionsClient from './_components/CorrectionsClient'

export default async function CorrectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()

  if (!profile || !['chief', 'admin', 'verifier'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const corrections = await getCorrections('all')
  const canReview   = ['chief', 'admin'].includes(profile.role)

  const pendingCount = corrections.filter(c => c.status === 'pending').length
  const t = await getTranslations('corrections')

  return (
    <div className="max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 text-xs bg-gold text-gold-foreground rounded-full font-semibold">
            {pendingCount} pending
          </span>
        )}
      </div>

      {!canReview && (
        <div className="mb-4 bg-accent border border-border rounded-lg px-4 py-3 text-sm text-accent-foreground">
          You can view your submitted requests here. Corrections are reviewed by an Admin.
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-6">
        <CorrectionsClient
          initialData={corrections as Parameters<typeof CorrectionsClient>[0]['initialData']}
          canReview={canReview}
        />
      </div>
    </div>
  )
}
