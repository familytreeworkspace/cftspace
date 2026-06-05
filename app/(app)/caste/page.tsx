import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CasteManager from './_components/CasteManager'

export default async function CastePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()

  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: castes } = await supabase
    .from('castes')
    .select('id, name, name_sindhi, name_hindi')
    .order('name')

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Caste Management</h1>
      </div>
      <div className="mb-4 bg-accent border border-border rounded-lg px-4 py-3 text-sm text-accent-foreground">
        Create castes first, then create sub-castes under each caste. Each community needs at least one caste with multiple sub-castes.
      </div>
      <div className="bg-card rounded-xl border border-border p-6">
        <CasteManager castes={castes ?? []} />
      </div>
    </div>
  )
}
