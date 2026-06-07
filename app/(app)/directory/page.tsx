import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDirectoryEntries } from '@/app/actions/directory'
import DirectoryClient from './_components/DirectoryClient'

export default async function DirectoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()

  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const entries = await getDirectoryEntries()

  // Check if user has AI credentials configured
  const { data: credentials } = await supabase
    .from('ai_credentials')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('auth_type', 'api_key')
    .limit(1) as any

  const hasAI = (credentials?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trilingual name directory — Sindhi, English, and Hindi.
          Names are auto-inserted on import. Use AI Convert to fill blank columns.
        </p>
      </div>

      <DirectoryClient initialEntries={entries} hasAI={hasAI} />
    </div>
  )
}
