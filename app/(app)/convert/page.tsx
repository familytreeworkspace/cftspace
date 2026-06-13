import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChartConverter from './_components/ChartConverter'

export default async function ConvertPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only chief and admin (same access as Import)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['chief', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Chart Converter</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Turn an old hand-drawn descent chart (.xls) into import-ready household &amp; member sheets.
          Runs entirely in your browser — nothing is uploaded to the server.
        </p>
      </div>

      <ChartConverter />
    </div>
  )
}
