import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImportWizard from './_components/ImportWizard'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Import wizard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bring records into CFTSpace in 5 guided steps.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between gap-4">
          {[
            { step: 1, label: 'Sub Caste', active: true, completed: true },
            { step: 2, label: 'Household', active: true, completed: false },
            { step: 3, label: 'Members', active: false, completed: false },
            { step: 4, label: 'Relations', active: false, completed: false },
            { step: 5, label: 'Contacts', active: false, completed: false },
          ].map((item, idx) => (
            <div key={item.step} className="flex items-center flex-1">
              {/* Circle */}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm flex-shrink-0 transition-all ${
                  item.completed
                    ? 'bg-primary text-primary-foreground'
                    : item.active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {item.completed ? '✓' : item.step}
              </div>

              {/* Line to next */}
              {idx < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                    item.completed ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Labels */}
        <div className="flex items-center justify-between gap-4 mt-4 text-xs text-muted-foreground">
          <span>Sub Caste</span>
          <span>Household</span>
          <span>Members</span>
          <span>Relations</span>
          <span>Contacts</span>
        </div>
      </div>

      {/* Import wizard content */}
      <ImportWizard subCastes={subCastes ?? []} />
    </div>
  )
}
