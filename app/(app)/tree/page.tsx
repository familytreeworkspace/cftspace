import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TreePine } from 'lucide-react'

export default async function TreePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch households
  const { data: households } = await supabase
    .from('households')
    .select('id, ghar_number, head_name, head_gender')
    .eq('is_active', true)
    .order('ghar_number')
    .limit(12)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          🌳 Family Trees
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a household to view its family tree.
        </p>
      </div>

      {!households || households.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          <p>No households found. Create one first.</p>
          <Link
            href="/households/new"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg heritage-gradient text-primary-foreground hover:opacity-90 transition-opacity"
          >
            ➕ Create Household
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {households.map(household => (
            <Link
              key={household.id}
              href={`/tree/${household.id}`}
              className="bg-card rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-md surface-elevated transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg heritage-gradient text-primary-foreground flex-shrink-0">
                  {household.head_gender === 'Female' ? '♀' : '♂'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {household.head_name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ghar #{household.ghar_number}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {households && households.length > 0 && (
        <Link
          href="/households"
          className="text-sm text-primary hover:underline"
        >
          View all households →
        </Link>
      )}
    </div>
  )
}
