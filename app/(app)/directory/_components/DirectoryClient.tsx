'use client'

import { useState, useTransition, useRef } from 'react'
import {
  updateDirectoryEntry,
  deleteDirectoryEntry,
  bulkAIConvert,
  autoBackfill,
  syncFromDatabase,
} from '@/app/actions/directory'
import type { DirectoryEntry } from '@/app/actions/directory'

const CATEGORIES = ['name', 'place', 'profession', 'education']

export default function DirectoryClient({
  initialEntries,
  hasAI,
}: {
  initialEntries: DirectoryEntry[]
  hasAI: boolean
}) {
  const [entries, setEntries]         = useState<DirectoryEntry[]>(initialEntries)
  const [filter, setFilter]           = useState<'all' | 'blank' | string>('all')
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editVal, setEditVal]         = useState('')
  const [aiQty, setAiQty]             = useState(20)
  const [aiResult, setAiResult]       = useState<{ converted: number; errors: string[] } | null>(null)
  const [backfillResult, setBackfillResult] = useState<{
    householdsUpdated: number; membersUpdated: number; errors: string[]
  } | null>(null)
  const [syncResult, setSyncResult] = useState<{
    inserted: number; skipped: number; errors: string[]
  } | null>(null)
  const [isPending, startTransition]  = useTransition()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<any>(null)

  const displayed = entries.filter(e => {
    if (filter === 'blank') return !e.english_word || !e.hindi_word
    if (filter === 'all')   return true
    return e.category === filter
  })

  const blankCount = entries.filter(e => !e.english_word || !e.hindi_word).length

  function startEdit(id: string, field: string, current: string | null) {
    setEditingCell({ id, field })
    setEditVal(current ?? '')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit(id: string, field: 'english_word' | 'hindi_word' | 'category') {
    if (!editingCell) return
    setEditingCell(null)

    startTransition(async () => {
      const result = await updateDirectoryEntry(id, { [field]: editVal || null })
      if (!result.error) {
        setEntries(prev =>
          prev.map(e => e.id === id ? { ...e, [field]: editVal || null } : e)
        )
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteDirectoryEntry(id)
      if (!result.error) {
        setEntries(prev => prev.filter(e => e.id !== id))
      }
    })
  }

  function handleAIConvert() {
    setAiResult(null)
    startTransition(async () => {
      const result = await bulkAIConvert(aiQty)
      setAiResult(result)
      // Reload entries from server (simplest: trigger page reload via revalidation)
      // For now, update state by re-fetching would require a server action; just show result
      // User can refresh to see updated entries
    })
  }

  function handleBackfill() {
    setBackfillResult(null)
    startTransition(async () => {
      const result = await autoBackfill()
      setBackfillResult(result)
    })
  }

  function handleSync() {
    setSyncResult(null)
    startTransition(async () => {
      const result = await syncFromDatabase()
      setSyncResult(result)
      if (result.inserted > 0) {
        // Reload page to show newly synced entries
        window.location.reload()
      }
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-4">
      {/* Table — 3/4 width */}
      <div className="xl:col-span-3 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {(['all', 'blank', ...CATEGORIES] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-foreground hover:bg-accent',
              ].join(' ')}
            >
              {f === 'all'   ? `All (${entries.length})` :
               f === 'blank' ? `Needs AI (${blankCount})` :
               f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No entries in this view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Sindhi سنڌي
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      English
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Hindi हिंदी
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Category
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayed.map(entry => (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors group">
                      {/* Sindhi — not editable (unique key) */}
                      <td className="px-4 py-2.5 font-medium text-foreground" dir="rtl">
                        {entry.sindhi_word}
                      </td>

                      {/* English — inline editable */}
                      <EditableCell
                        value={entry.english_word}
                        isEditing={editingCell?.id === entry.id && editingCell.field === 'english_word'}
                        editVal={editVal}
                        inputRef={editingCell?.id === entry.id && editingCell.field === 'english_word' ? inputRef : undefined}
                        onStartEdit={() => startEdit(entry.id, 'english_word', entry.english_word)}
                        onEditChange={setEditVal}
                        onCommit={() => commitEdit(entry.id, 'english_word')}
                        onCancel={() => setEditingCell(null)}
                      />

                      {/* Hindi — inline editable */}
                      <EditableCell
                        value={entry.hindi_word}
                        isEditing={editingCell?.id === entry.id && editingCell.field === 'hindi_word'}
                        editVal={editVal}
                        inputRef={editingCell?.id === entry.id && editingCell.field === 'hindi_word' ? inputRef : undefined}
                        onStartEdit={() => startEdit(entry.id, 'hindi_word', entry.hindi_word)}
                        onEditChange={setEditVal}
                        onCommit={() => commitEdit(entry.id, 'hindi_word')}
                        onCancel={() => setEditingCell(null)}
                        isHindi
                      />

                      {/* Category — inline select */}
                      <td className="px-4 py-2.5">
                        <select
                          value={entry.category}
                          onChange={e => {
                            const val = e.target.value
                            setEntries(prev => prev.map(en => en.id === entry.id ? { ...en, category: val } : en))
                            startTransition(async () => {
                              await updateDirectoryEntry(entry.id, { category: val })
                            })
                          }}
                          className="text-xs rounded border border-border bg-background text-foreground px-2 py-1"
                        >
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={isPending}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all text-xs disabled:opacity-30"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Click English or Hindi cell to edit. Press Enter or click away to save.
        </p>
      </div>

      {/* Sidebar — tools */}
      <div className="space-y-4">

        {/* AI Convert */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            AI Convert
          </h3>
          <p className="text-xs text-muted-foreground">
            Automatically fill English and Hindi columns for entries that have only Sindhi.
          </p>

          {!hasAI && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200">
              No AI API key configured. Add one in Settings to use this feature.
            </p>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Quantity:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={aiQty}
              onChange={e => setAiQty(Number(e.target.value))}
              className="w-16 px-2 py-1 text-sm rounded border border-border bg-background text-foreground"
            />
          </div>

          <button
            onClick={handleAIConvert}
            disabled={isPending || !hasAI}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg heritage-gradient text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? 'Converting...' : `Convert ${aiQty} entries`}
          </button>

          {aiResult && (
            <div className={`text-xs rounded-lg p-2 ${aiResult.errors.length ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
              {aiResult.converted} converted.
              {aiResult.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {aiResult.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              <p className="mt-1 text-muted-foreground">Refresh page to see updated entries.</p>
            </div>
          )}
        </div>

        {/* Auto-backfill */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Auto-backfill</h3>
          <p className="text-xs text-muted-foreground">
            After AI fills Directory entries, scan Households and Members to populate blank Sindhi / Hindi columns from Directory matches.
          </p>

          <button
            onClick={handleBackfill}
            disabled={isPending}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Scanning...' : 'Run Backfill'}
          </button>

          {backfillResult && (
            <div className={`text-xs rounded-lg p-2 ${backfillResult.errors.length ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
              {backfillResult.householdsUpdated} households, {backfillResult.membersUpdated} members updated.
              {backfillResult.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {backfillResult.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Sync from Database */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Sync from Database</h3>
          <p className="text-xs text-muted-foreground">
            Scan all existing Households and Members and load any names not yet in Directory.
            Run this once to load data that was imported before the Directory was created.
          </p>

          <button
            onClick={handleSync}
            disabled={isPending}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Scanning...' : 'Sync from Database'}
          </button>

          {syncResult && (
            <div className={`text-xs rounded-lg p-2 ${syncResult.errors.length ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
              {syncResult.inserted} names added.
              {syncResult.skipped > 0 && ` ${syncResult.skipped} already existed.`}
              {syncResult.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {syncResult.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-2 text-sm">
          <h3 className="font-semibold text-foreground">Summary</h3>
          <div className="flex justify-between text-muted-foreground">
            <span>Total entries</span>
            <span className="font-medium text-foreground">{entries.length}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Needs AI</span>
            <span className={`font-medium ${blankCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>{blankCount}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Complete</span>
            <span className="font-medium text-green-600">{entries.length - blankCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditableCell({
  value,
  isEditing,
  editVal,
  inputRef,
  onStartEdit,
  onEditChange,
  onCommit,
  onCancel,
  isHindi,
}: {
  value: string | null
  isEditing: boolean
  editVal: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputRef?: React.RefObject<any>
  onStartEdit: () => void
  onEditChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
  isHindi?: boolean
}) {
  const isEmpty = !value

  if (isEditing) {
    return (
      <td className="px-4 py-2.5">
        <input
          ref={inputRef}
          value={editVal}
          onChange={e => onEditChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => {
            if (e.key === 'Enter') onCommit()
            if (e.key === 'Escape') onCancel()
          }}
          className="w-full px-2 py-1 text-sm rounded border border-primary bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          dir={isHindi ? 'ltr' : undefined}
        />
      </td>
    )
  }

  return (
    <td
      className={[
        'px-4 py-2.5 cursor-pointer rounded transition-colors hover:bg-primary/5',
        isEmpty ? 'text-amber-400 italic' : 'text-foreground',
      ].join(' ')}
      onClick={onStartEdit}
      title="Click to edit"
    >
      {isEmpty ? '— click to add —' : value}
    </td>
  )
}
