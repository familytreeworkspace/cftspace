'use client'

import { useState, useTransition, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import {
  updateDirectoryEntry,
  deleteDirectoryEntry,
  bulkAIConvert,
  convertSingleEntry,
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
  const [entries, setEntries]               = useState<DirectoryEntry[]>(initialEntries)
  const [filter, setFilter]                 = useState<'all' | 'blank' | string>('all')
  const [editingCell, setEditingCell]       = useState<{ id: string; field: string } | null>(null)
  const [editVal, setEditVal]               = useState('')
  const [aiQty, setAiQty]                   = useState(20)
  // IDs currently shown in "converting" focus view (bulk convert)
  const [focusedIds, setFocusedIds]         = useState<Set<string> | null>(null)
  const [aiResult, setAiResult]             = useState<{ converted: number; errors: string[] } | null>(null)
  // Per-row converting state
  const [rowConverting, setRowConverting]   = useState<Set<string>>(new Set())
  const [rowErrors, setRowErrors]           = useState<Record<string, string>>({})
  const [backfillResult, setBackfillResult] = useState<{
    householdsUpdated: number; membersUpdated: number; errors: string[]
  } | null>(null)
  const [syncResult, setSyncResult]         = useState<{
    inserted: number; skipped: number; errors: string[]
  } | null>(null)
  const [isPending, startTransition]        = useTransition()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<any>(null)

  const blankCount = entries.filter(e => !e.english_word || !e.hindi_word).length

  // Decide what to show in the table
  const displayed = (() => {
    // During bulk convert: show only the focused entries
    if (focusedIds) return entries.filter(e => focusedIds.has(e.id))
    if (filter === 'blank') return entries.filter(e => !e.english_word || !e.hindi_word)
    if (filter !== 'all')   return entries.filter(e => e.category === filter)
    return entries
  })()

  // ── Inline edit ─────────────────────────────────────────────────────────────

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
        setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: editVal || null } : e))
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteDirectoryEntry(id)
      if (!result.error) setEntries(prev => prev.filter(e => e.id !== id))
    })
  }

  // ── Bulk AI convert ──────────────────────────────────────────────────────────

  function handleAIConvert() {
    setAiResult(null)
    // Find which entries will be converted (first N blank ones) — show only these
    const willConvert = entries.filter(e => !e.english_word || !e.hindi_word).slice(0, aiQty)
    if (!willConvert.length) return
    setFocusedIds(new Set(willConvert.map(e => e.id)))

    startTransition(async () => {
      const result = await bulkAIConvert(aiQty)
      setAiResult({ converted: result.converted, errors: result.errors })
      // Apply returned values into local state
      if (result.updatedEntries.length) {
        setEntries(prev => prev.map(e => {
          const upd = result.updatedEntries.find(u => u.id === e.id)
          return upd ? { ...e, english_word: upd.english_word, hindi_word: upd.hindi_word } : e
        }))
      }
      setFocusedIds(null)
    })
  }

  function exitFocus() {
    setFocusedIds(null)
    setAiResult(null)
  }

  // ── Per-row AI convert ───────────────────────────────────────────────────────

  function handleRowConvert(id: string) {
    setRowErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    setRowConverting(prev => new Set([...prev, id]))

    // Use a plain async IIFE — startTransition would batch it with other transitions
    ;(async () => {
      const result = await convertSingleEntry(id)
      setRowConverting(prev => { const n = new Set(prev); n.delete(id); return n })
      if (result.error) {
        setRowErrors(prev => ({ ...prev, [id]: result.error! }))
      } else {
        setEntries(prev => prev.map(e =>
          e.id === id
            ? { ...e, english_word: result.english_word, hindi_word: result.hindi_word }
            : e
        ))
      }
    })()
  }

  // ── Backfill & Sync ──────────────────────────────────────────────────────────

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
      if (result.inserted > 0) window.location.reload()
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 xl:grid-cols-4">

      {/* Table — 3/4 */}
      <div className="xl:col-span-3 space-y-4">

        {/* Focus banner — shown during / after bulk convert */}
        {focusedIds && (
          <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 text-sm text-primary">
            <span>
              {isPending
                ? `Converting ${focusedIds.size} entries — please wait…`
                : `Showing ${focusedIds.size} converted entries`}
            </span>
            {!isPending && (
              <button onClick={exitFocus} className="text-xs underline hover:no-underline">
                Show all
              </button>
            )}
          </div>
        )}

        {/* Filters — hidden while in focus mode */}
        {!focusedIds && (
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
        )}

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
                    <th className="px-4 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayed.map(entry => (
                    <tr
                      key={entry.id}
                      className={[
                        'transition-colors group',
                        focusedIds?.has(entry.id) && isPending
                          ? 'bg-primary/5 animate-pulse'
                          : 'hover:bg-muted/20',
                      ].join(' ')}
                    >
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

                      {/* Actions: per-row convert + delete */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {/* Per-row AI convert */}
                          {hasAI && (
                            <button
                              onClick={() => handleRowConvert(entry.id)}
                              disabled={rowConverting.has(entry.id)}
                              title="Convert this entry via AI"
                              className={[
                                'p-1 rounded text-xs transition-colors',
                                rowConverting.has(entry.id)
                                  ? 'text-green-600 animate-spin'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50',
                              ].join(' ')}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={isPending}
                            title="Delete"
                            className="p-1 rounded text-xs text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Per-row error */}
                        {rowErrors[entry.id] && (
                          <div className="text-[10px] text-red-500 max-w-[120px] leading-tight mt-0.5">
                            {rowErrors[entry.id]}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Click English or Hindi cell to edit inline.
          {hasAI && ' Hover a row and click ✦ to convert just that entry.'}
        </p>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">

        {/* AI Bulk Convert */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Convert
          </h3>
          <p className="text-xs text-muted-foreground">
            Fill English and Hindi for the top N entries that have blank columns.
            The table will focus on those entries during conversion.
          </p>

          {!hasAI && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200">
              No AI API key configured. Add one in Settings.
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
            {isPending && focusedIds ? `Converting…` : `Convert ${aiQty} entries`}
          </button>

          {aiResult && !focusedIds && (
            <div className={`text-xs rounded-lg p-2 ${aiResult.errors.length ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
              {aiResult.converted} converted.
              {aiResult.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {aiResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Auto-backfill */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Auto-backfill</h3>
          <p className="text-xs text-muted-foreground">
            After AI fills Directory, scan Households and Members to populate blank Sindhi / Hindi columns.
          </p>

          <button
            onClick={handleBackfill}
            disabled={isPending}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Scanning…' : 'Run Backfill'}
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
            Load all names from existing Households and Members into Directory.
          </p>

          <button
            onClick={handleSync}
            disabled={isPending}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Scanning…' : 'Sync from Database'}
          </button>

          {syncResult && (
            <div className={`text-xs rounded-lg p-2 ${syncResult.errors.length ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
              {syncResult.inserted} names added.
              {syncResult.skipped > 0 && ` ${syncResult.skipped} already existed.`}
              {syncResult.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {syncResult.errors.map((e, i) => <li key={i}>{e}</li>)}
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

// ── Inline editable cell ─────────────────────────────────────────────────────

function EditableCell({
  value, isEditing, editVal, inputRef,
  onStartEdit, onEditChange, onCommit, onCancel,
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
  if (isEditing) {
    return (
      <td className="px-4 py-2.5">
        <input
          ref={inputRef}
          value={editVal}
          onChange={e => onEditChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => {
            if (e.key === 'Enter')  onCommit()
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
        !value ? 'text-amber-400 italic text-xs' : 'text-foreground',
      ].join(' ')}
      onClick={onStartEdit}
      title="Click to edit"
    >
      {value ?? '— click to add —'}
    </td>
  )
}
