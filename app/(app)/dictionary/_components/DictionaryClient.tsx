'use client'

import { useState } from 'react'
import { useTransition } from 'react'
import { addDictionaryEntry, verifyDictionaryEntry } from '@/app/actions/dictionary'

interface DictEntry {
  id: string
  wrong_word: string
  correct_word: string
  added_by_type: string
  is_verified: boolean
  created_at: string
}

export default function DictionaryClient({
  manualEntries,
  aiEntries,
}: {
  manualEntries: DictEntry[]
  aiEntries: DictEntry[]
}) {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual')
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({ wrong: '', correct: '' })
  const [entries, setEntries] = useState({
    manual: manualEntries,
    ai: aiEntries,
  })

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.wrong.trim() || !formData.correct.trim()) return

    startTransition(async () => {
      await addDictionaryEntry(formData.wrong, formData.correct, 'manual')
      setFormData({ wrong: '', correct: '' })
      // Refetch would need to be handled via server action callback
    })
  }

  const handleVerify = (id: string) => {
    startTransition(async () => {
      await verifyDictionaryEntry(id)
      setEntries(prev => ({
        ...prev,
        ai: prev.ai.filter(e => e.id !== id),
      }))
    })
  }

  const currentEntries = activeTab === 'manual' ? entries.manual : entries.ai

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-foreground hover:bg-accent'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-foreground hover:bg-accent'
            }`}
          >
            ✨ AI Corrected
          </button>
          <span className="ml-auto text-sm text-muted-foreground py-2">
            {currentEntries.length} entries
          </span>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {currentEntries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No {activeTab === 'ai' ? 'AI-corrected' : 'manual'} entries yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Wrong
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Correct
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Source
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-red-600 font-medium">
                          {entry.wrong_word}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-primary font-medium">
                          {entry.correct_word}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {entry.added_by_type === 'manual' ? 'Admin' : 'System'}
                      </td>
                      <td className="px-5 py-3">
                        {activeTab === 'ai' ? (
                          <button
                            onClick={() => handleVerify(entry.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-50"
                          >
                            {isPending ? 'Verifying...' : 'Verify'}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add entry form */}
      <div className="lg:col-span-1">
        <div className="bg-card rounded-xl border border-border p-6 h-fit">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            ➕ Add entry
          </h3>

          <form onSubmit={handleAddEntry} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Wrong spelling
              </label>
              <input
                type="text"
                value={formData.wrong}
                onChange={e => setFormData(p => ({ ...p, wrong: e.target.value }))}
                placeholder="e.g. Lohanaa"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Correct spelling
              </label>
              <input
                type="text"
                value={formData.correct}
                onChange={e => setFormData(p => ({ ...p, correct: e.target.value }))}
                placeholder="e.g. Lohana"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !formData.wrong.trim() || !formData.correct.trim()}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg heritage-gradient text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? 'Adding...' : 'Add to dictionary'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
