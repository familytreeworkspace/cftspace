import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './_components/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch existing AI credentials (without the encrypted credential)
  const { data: credentials } = await supabase
    .from('ai_credentials')
    .select('id, provider, auth_type, is_active, created_at')
    .eq('user_id', user.id)

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and AI service credentials</p>
      </div>

      <SettingsClient
        userEmail={user.email || ''}
        existingCredentials={credentials ?? []}
      />
    </div>
  )
}
