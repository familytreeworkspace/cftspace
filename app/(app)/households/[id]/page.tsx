import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MembersSection from './_components/MembersSection'
import CorrectionTrigger from '@/app/(app)/corrections/_components/CorrectionTrigger'
import { deleteHousehold, deleteContact, addContact } from '@/app/actions/households'

export default async function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: household } = await supabase
    .from('households')
    .select(`
      id, ghar_number, head_name, head_gender,
      sub_caste_id, dob_year, education, profession,
      original_address, current_address, photo_url, is_active,
      sub_castes(name)
    `)
    .eq('id', id)
    .single()

  if (!household || !household.is_active) notFound()

  const { data: members } = await supabase
    .from('members')
    .select('id, member_number, name, gender, relation_code, dob_year, education, profession, sub_caste_id')
    .eq('household_id', id)
    .order('member_number')

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, contact_number, contact_type, display_order')
    .eq('household_id', id)
    .order('display_order')

  const { data: subCastes } = await supabase
    .from('sub_castes').select('id, name').order('name')

  const canEdit      = ['chief', 'admin'].includes(profile.role)
  const canAdd       = ['chief', 'admin', 'verifier'].includes(profile.role)
  const canCorrect   = ['chief', 'admin', 'verifier'].includes(profile.role)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subCasteName = (household.sub_castes as any)?.name ?? '—'

  async function handleDeleteHousehold() {
    'use server'
    await deleteHousehold(id)
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Page title row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <a href="/households" className="hover:text-primary">Households</a>
            <span>/</span>
            <span>Ghar #{household.ghar_number}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{household.head_name}</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <a
              href={`/households/${id}/edit`}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Edit
            </a>
            <form action={handleDeleteHousehold}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium border border-destructive/40 text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                onClick={e => { if (!confirm('Delete this household?')) e.preventDefault() }}
              >
                Delete
              </button>
            </form>
          </div>
        )}
      </div>

      {/* rest of content below without wrapper div */}
      <div className="space-y-6">
        {/* Household Info Card */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 bg-muted/40 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full heritage-gradient flex items-center justify-center text-primary-foreground font-bold text-sm">
              {household.head_gender === 'Female' ? '♀' : '♂'}
            </div>
            <div>
              <div className="font-semibold text-card-foreground">{household.head_name}</div>
              <div className="text-xs text-gray-500">
                {subCasteName} · Ghar #{household.ghar_number}
              </div>
            </div>
            <a
              href={`/tree/${id}`}
              className="ml-auto text-sm text-primary hover:underline flex items-center gap-1"
            >
              🌳 View Tree
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
            <InfoField label="Ghar Number" value={household.ghar_number} />
            <InfoField label="Gender" value={household.head_gender} />
            {canCorrect ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-0.5">Birth Year</dt>
                <CorrectionTrigger tableName="households" recordId={id} fieldName="dob_year" fieldLabel="Birth Year" currentValue={household.dob_year?.toString() ?? ''}>
                  <dd className="text-sm text-gray-800">{household.dob_year || <span className="text-gray-300">—</span>}</dd>
                </CorrectionTrigger>
              </div>
            ) : <InfoField label="Birth Year" value={household.dob_year?.toString()} />}
            <InfoField label="Sub Caste" value={subCasteName} />
            {canCorrect ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-0.5">Education</dt>
                <CorrectionTrigger tableName="households" recordId={id} fieldName="education" fieldLabel="Education" currentValue={household.education ?? ''}>
                  <dd className="text-sm text-gray-800">{household.education || <span className="text-gray-300">—</span>}</dd>
                </CorrectionTrigger>
              </div>
            ) : <InfoField label="Education" value={household.education} />}
            {canCorrect ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-0.5">Profession</dt>
                <CorrectionTrigger tableName="households" recordId={id} fieldName="profession" fieldLabel="Profession" currentValue={household.profession ?? ''}>
                  <dd className="text-sm text-gray-800">{household.profession || <span className="text-gray-300">—</span>}</dd>
                </CorrectionTrigger>
              </div>
            ) : <InfoField label="Profession" value={household.profession} />}
            {canCorrect ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-0.5">Original Address</dt>
                <CorrectionTrigger tableName="households" recordId={id} fieldName="original_address" fieldLabel="Original Address" currentValue={household.original_address ?? ''}>
                  <dd className="text-sm text-gray-800">{household.original_address || <span className="text-gray-300">—</span>}</dd>
                </CorrectionTrigger>
              </div>
            ) : <InfoField label="Original Address" value={household.original_address} />}
            {canCorrect ? (
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-0.5">Current Address</dt>
                <CorrectionTrigger tableName="households" recordId={id} fieldName="current_address" fieldLabel="Current Address" currentValue={household.current_address ?? ''}>
                  <dd className="text-sm text-gray-800">{household.current_address || <span className="text-gray-300">—</span>}</dd>
                </CorrectionTrigger>
              </div>
            ) : <InfoField label="Current Address" value={household.current_address} />}
          </div>
          {canCorrect && (
            <p className="text-xs text-gray-400 px-6 pb-4">Hover over a field value to request a correction.</p>
          )}
        </div>

        {/* Members */}
        <div className="bg-card rounded-xl border border-border p-6">
          <MembersSection
            householdId={id}
            members={members ?? []}
            subCastes={subCastes ?? []}
            canEdit={canAdd}
          />
        </div>

        {/* Contacts */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">
              Contacts
              <span className="ml-2 text-sm font-normal text-gray-400">({contacts?.length ?? 0})</span>
            </h3>
          </div>

          <div className="space-y-2 mb-4">
            {(contacts ?? []).map(c => (
              <div key={c.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">📞</span>
                  <span className="font-mono text-gray-800">{c.contact_number}</span>
                  <span className="text-xs text-gray-400">{c.contact_type}</span>
                </div>
                {canEdit && (
                  <form action={async (): Promise<void> => {
                    'use server'
                    await deleteContact(c.id, id)
                  }}>
                    <button type="submit" className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </form>
                )}
              </div>
            ))}
            {(contacts ?? []).length === 0 && (
              <p className="text-sm text-gray-400">No contacts added.</p>
            )}
          </div>

          {canAdd && (
            <form action={addContact} className="flex gap-2">
              <input type="hidden" name="household_id" value={id} />
              <input
                name="contact_number"
                placeholder="Add phone number"
                className="flex-1 max-w-xs px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                name="contact_type"
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mobile">Mobile</option>
                <option value="landline">Landline</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 text-sm font-medium heritage-gradient text-primary-foreground rounded-lg hover:opacity-90"
              >
                Add
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-sm text-foreground">{value || <span className="text-muted-foreground/40">—</span>}</dd>
    </div>
  )
}
