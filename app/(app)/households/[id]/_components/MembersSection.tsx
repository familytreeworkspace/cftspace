'use client'

import { useState, useTransition } from 'react'
import { createMember, updateMember, deleteMember } from '@/app/actions/households'
import { getTransliteration } from '@/app/actions/transliteration'

interface SubCaste { id: string; name: string }
interface Member {
  id: string
  member_number: number | null
  name: string
  name_sindhi?: string | null
  name_hindi?: string | null
  gender: string
  relation_code: string
  dob_year: number | null
  education: string | null
  profession: string | null
  sub_caste_id: string | null
}

const RELATION_LABELS: Record<string, string> = {
  'زال': 'Wife (زال)',
  'ٻت': 'Son (ٻت)',
  'ڏي': 'Daughter (ڏي)',
  'ماءُ': 'Mother (ماءُ)',
}

export default function MembersSection({
  householdId,
  members,
  subCastes,
  canEdit,
}: {
  householdId: string
  members: Member[]
  subCastes: SubCaste[]
  canEdit: boolean
}) {
  const [showModal, setShowModal] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Transliteration state
  const [nameValue, setNameValue] = useState(editMember?.name || '')
  const [sindhiName, setSindhiName] = useState(editMember?.name_sindhi || '')
  const [hindiName, setHindiName] = useState(editMember?.name_hindi || '')
  const [confidence, setConfidence] = useState(0)

  const scMap = new Map(subCastes.map(s => [s.id, s.name]))

  function openAdd() {
    setEditMember(null)
    setNameValue('')
    setSindhiName('')
    setHindiName('')
    setConfidence(0)
    setError(null)
    setShowModal(true)
  }

  function openEdit(m: Member) {
    setEditMember(m)
    setNameValue(m.name)
    setSindhiName(m.name_sindhi || '')
    setHindiName(m.name_hindi || '')
    setConfidence(0)
    setError(null)
    setShowModal(true)
  }

  async function handleGetSuggestion() {
    if (!nameValue.trim()) {
      setError('Please enter member name first')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await getTransliteration(nameValue, `Relation: ${editMember?.relation_code || 'Family member'}`)
      if (result.error) {
        setError(result.error)
      } else {
        setSindhiName(result.sindhi)
        setHindiName(result.hindi)
        setConfidence(result.confidence)
      }
    })
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    formData.set('household_id', householdId)

    // Add Sindhi/Hindi values
    if (sindhiName) formData.append('name_sindhi', sindhiName)
    if (hindiName) formData.append('name_hindi', hindiName)

    const result = editMember
      ? await updateMember(editMember.id, householdId, formData)
      : await createMember(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setShowModal(false)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await deleteMember(id, householdId)
    setConfirmDelete(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">
          Members
          <span className="ml-2 text-sm font-normal text-muted-foreground">({members.length})</span>
        </h3>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium heritage-gradient text-primary-foreground rounded-lg hover:opacity-90"
          >
            ➕ Add Member
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="bg-muted/30 rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          No members added yet.
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-10">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Relation</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Gender</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Birth Year</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Sub Caste</th>
                {canEdit && <th className="w-20" />}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id} className={`border-t border-border ${i % 2 !== 0 ? 'bg-muted/20' : ''}`}>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{m.member_number ?? i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{m.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-xs" dir="rtl">
                      {m.relation_code}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground hidden sm:inline">
                      {RELATION_LABELS[m.relation_code] ? `(${RELATION_LABELS[m.relation_code].split('(')[0].trim()})` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.gender}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{m.dob_year ?? '—'}</td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    {m.sub_caste_id ? (
                      <span className="text-xs text-primary">{scMap.get(m.sub_caste_id) ?? '—'}</span>
                    ) : '—'}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(m)}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(m.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="font-semibold text-foreground">
                {editMember ? '✏️ Edit Member' : '➕ Add Member'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <form action={handleSubmit} className="p-6 space-y-5">
              <input type="hidden" name="household_id" value={householdId} />

              {/* Name Section */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Name (English) <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="name"
                    required
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    placeholder="Full name in English"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleGetSuggestion}
                    disabled={isPending}
                    className="px-3 py-2 text-sm font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    🤖 {isPending ? 'Getting...' : 'Suggest'}
                  </button>
                </div>
              </div>

              {/* Sindhi Name */}
              {(sindhiName || confidence > 0) && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Name (Sindhi) سنڌي
                    </label>
                    <span className="text-xs font-semibold text-primary">
                      {confidence}% confidence
                    </span>
                  </div>
                  <input
                    type="text"
                    value={sindhiName}
                    onChange={e => setSindhiName(e.target.value)}
                    placeholder="Sindhi transliteration"
                    dir="rtl"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {/* Hindi Name */}
              {(hindiName || confidence > 0) && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Name (Hindi) हिंदी
                  </label>
                  <input
                    type="text"
                    value={hindiName}
                    onChange={e => setHindiName(e.target.value)}
                    placeholder="Hindi transliteration"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Relation <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="relation_code"
                    required
                    defaultValue={editMember?.relation_code ?? ''}
                    placeholder="زال / ٻت / ڏي / ماءُ"
                    dir="rtl"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Gender</label>
                  <select
                    name="gender"
                    defaultValue={editMember?.gender ?? 'Male'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Birth Year</label>
                  <input
                    name="dob_year"
                    type="number"
                    min="1900"
                    max="2025"
                    defaultValue={editMember?.dob_year ?? ''}
                    placeholder="e.g. 1990"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Member #</label>
                  <input
                    name="member_number"
                    type="number"
                    defaultValue={editMember?.member_number ?? ''}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Education</label>
                  <input
                    name="education"
                    defaultValue={editMember?.education ?? ''}
                    placeholder="e.g. Matric"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Profession</label>
                  <input
                    name="profession"
                    defaultValue={editMember?.profession ?? ''}
                    placeholder="e.g. Farmer"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sub Caste</label>
                  <select
                    name="sub_caste_id"
                    defaultValue={editMember?.sub_caste_id ?? ''}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— Auto from household —</option>
                    {subCastes.map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Saving...' : editMember ? 'Save Changes' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm w-full border border-border">
            <h3 className="font-semibold text-foreground mb-2">Delete Member?</h3>
            <p className="text-sm text-muted-foreground mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
