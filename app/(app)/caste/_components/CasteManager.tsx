'use client'

import { useState, useTransition } from 'react'
import { createCaste, updateCaste, deleteCaste } from '@/app/actions/caste'
import { getTransliteration } from '@/app/actions/transliteration'

interface Caste { id: string; name: string; name_sindhi: string | null; name_hindi: string | null }

export default function CasteManager({ castes }: { castes: Caste[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Caste | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const [isTranslating, startTranslating] = useTransition()

  // Transliteration state
  const [nameValue, setNameValue] = useState(editItem?.name || '')
  const [sindhiName, setSindhiName] = useState(editItem?.name_sindhi || '')
  const [hindiName, setHindiName] = useState(editItem?.name_hindi || '')
  const [confidence, setConfidence] = useState(0)

  async function handleGetSuggestion() {
    if (!nameValue.trim()) {
      setError('Please enter caste name first')
      return
    }

    setError(null)
    startTranslating(async () => {
      const result = await getTransliteration(nameValue, 'Caste name transliteration')
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
    setError(null)
    start(async () => {
      // Add transliterated values
      if (sindhiName) formData.append('name_sindhi', sindhiName)
      if (hindiName) formData.append('name_hindi', hindiName)

      const result = editItem
        ? await updateCaste(editItem.id, formData)
        : await createCaste(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setShowForm(false)
        setEditItem(null)
        setNameValue('')
        setSindhiName('')
        setHindiName('')
        setConfidence(0)
      }
    })
  }

  async function handleDelete(id: string) {
    setError(null)
    start(async () => {
      const result = await deleteCaste(id)
      if (result.error) {
        setError(result.error)
      }
      setConfirmDel(null)
    })
  }

  const isFormOpen = showForm || !!editItem

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="text-sm text-muted-foreground">{castes.length} castes</span>
        <button
          onClick={() => {
            setShowForm(true)
            setEditItem(null)
            setNameValue('')
            setSindhiName('')
            setHindiName('')
            setConfidence(0)
            setError(null)
          }}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90"
        >
          ➕ Add Caste
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add/Edit form */}
      {isFormOpen && (
        <div className="bg-muted/30 border border-border rounded-xl p-5 mb-5">
          <h3 className="font-semibold text-foreground mb-4">
            {editItem ? '✏️ Edit Caste' : '➕ Add New Caste'}
          </h3>
          <form action={handleSubmit} className="space-y-4">
            {/* English Name + AI Button */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Name (English) <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="name"
                  required
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  placeholder="e.g. Chand"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleGetSuggestion}
                  disabled={isTranslating}
                  className="px-3 py-2 text-sm font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  🤖 {isTranslating ? 'Getting...' : 'Suggest'}
                </button>
              </div>
            </div>

            {/* Sindhi Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Name (Sindhi) سنڌي {confidence > 0 && <span className="text-xs text-primary">({confidence}%)</span>}
              </label>
              <input
                type="text"
                value={sindhiName}
                onChange={e => setSindhiName(e.target.value)}
                dir="rtl"
                placeholder="سنڌي نالو"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Hindi Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Name (Hindi) हिंदी
              </label>
              <input
                type="text"
                value={hindiName}
                onChange={e => setHindiName(e.target.value)}
                placeholder="हिंदी नाम"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : editItem ? 'Save Changes' : 'Create Caste'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditItem(null)
                  setNameValue('')
                  setSindhiName('')
                  setHindiName('')
                  setConfidence(0)
                }}
                className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Castes table */}
      {castes.length === 0 ? (
        <div className="bg-muted/30 rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          No castes found. Create one to get started.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Sindhi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Hindi</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {castes.map((caste, i) => (
                <tr key={caste.id} className={`border-t border-border ${i % 2 !== 0 ? 'bg-muted/20' : ''}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{caste.name}</td>
                  <td className="px-4 py-3 text-muted-foreground" dir="rtl">{caste.name_sindhi || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{caste.name_hindi || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setEditItem(caste)
                          setShowForm(false)
                          setNameValue(caste.name)
                          setSindhiName(caste.name_sindhi || '')
                          setHindiName(caste.name_hindi || '')
                          setConfidence(0)
                          setError(null)
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDel(caste.id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm w-full border border-border">
            <h3 className="font-semibold text-foreground mb-2">Delete Caste?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will fail if any sub-castes are linked to it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDel)}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-accent"
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
