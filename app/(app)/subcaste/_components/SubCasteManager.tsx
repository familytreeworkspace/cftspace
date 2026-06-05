'use client'

import { useState, useTransition } from 'react'
import { createSubCaste, updateSubCaste, deleteSubCaste } from '@/app/actions/subcaste'
import { getTransliteration } from '@/app/actions/transliteration'

interface Caste    { id: string; name: string }
interface SubCaste { id: string; name: string; name_sindhi: string | null; name_hindi: string | null; caste_id: string | null; household_count?: number }

export default function SubCasteManager({
  castes,
  subCastes,
}: {
  castes: Caste[]
  subCastes: SubCaste[]
}) {
  const [showForm, setShowForm]     = useState(false)
  const [editItem, setEditItem]     = useState<SubCaste | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [isPending, start]          = useTransition()
  const [isTranslating, startTranslating] = useTransition()
  const [filterCaste, setFilterCaste] = useState('')

  // Transliteration state
  const [nameValue, setNameValue] = useState(editItem?.name || '')
  const [sindhiName, setSindhiName] = useState(editItem?.name_sindhi || '')
  const [hindiName, setHindiName] = useState(editItem?.name_hindi || '')
  const [confidence, setConfidence] = useState(0)

  const casteMap = new Map(castes.map(c => [c.id, c.name]))
  const filtered = filterCaste
    ? subCastes.filter(s => s.caste_id === filterCaste)
    : subCastes

  async function handleGetSuggestion() {
    if (!nameValue.trim()) {
      setError('Please enter sub-caste name first')
      return
    }

    setError(null)
    startTranslating(async () => {
      const result = await getTransliteration(nameValue, 'Sub-caste name transliteration')
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
        ? await updateSubCaste(editItem.id, formData)
        : await createSubCaste(formData)

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
      const result = await deleteSubCaste(id)
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
        <select
          value={filterCaste}
          onChange={e => setFilterCaste(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Castes</option>
          {castes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} sub castes</span>
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
          ➕ Add Sub Caste
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add/Edit form */}
      {isFormOpen && (
        <div className="bg-muted/30 border border-border rounded-xl p-5 mb-5">
          <h3 className="font-semibold text-foreground mb-4">
            {editItem ? '✏️ Edit Sub Caste' : '➕ Add New Sub Caste'}
          </h3>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Caste <span className="text-destructive">*</span>
                </label>
                <select
                  name="caste_id"
                  required
                  defaultValue={editItem?.caste_id ?? ''}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Select Caste —</option>
                  {castes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

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
                  placeholder="e.g. Makwana"
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
                {isPending ? 'Saving...' : editItem ? 'Save Changes' : 'Create Sub Caste'}
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

      {/* Sub caste table */}
      {filtered.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          No sub castes found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Sindhi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Hindi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Caste</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-24">Households</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((sc, i) => (
                <tr key={sc.id} className={`border-t border-gray-100 ${i % 2 !== 0 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{sc.name}</td>
                  <td className="px-4 py-3 text-gray-500" dir="rtl">{sc.name_sindhi || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{sc.name_hindi || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {casteMap.get(sc.caste_id ?? '') ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {sc.household_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setEditItem(sc)
                          setShowForm(false)
                          setNameValue(sc.name)
                          setSindhiName(sc.name_sindhi || '')
                          setHindiName(sc.name_hindi || '')
                          setConfidence(0)
                          setError(null)
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDel(sc.id)}
                        className="text-xs text-red-500 hover:underline"
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

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full">
            <h3 className="font-semibold text-gray-800 mb-2">Delete Sub Caste?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will fail if any households are linked to it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDel)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDel(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
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
