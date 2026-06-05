import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DictionaryClient from './_components/DictionaryClient'

export default async function DictionaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()

  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: manualEntries } = await supabase
    .from('dictionary')
    .select('*')
    .eq('added_by_type', 'manual')
    .order('created_at', { ascending: false })

  const { data: aiEntries } = await supabase
    .from('dictionary')
    .select('*')
    .eq('added_by_type', 'ai')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          📖 Dictionary
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Standardize spellings across imports.
        </p>
      </div>

      <DictionaryClient
        manualEntries={manualEntries ?? []}
        aiEntries={aiEntries ?? []}
      />
    </div>
  )
}
