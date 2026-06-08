'use client'

import { useState, useEffect, useRef } from 'react'
import { searchDirectory, upsertDirectoryEntry, type DirectoryEntry } from '@/app/actions/directory'

interface Props {
  category: string                       // 'name' | 'relation' | 'profession' | 'education' | 'sub_caste' | 'village'
  value: string
  onChange: (v: string) => void
  onPick?: (e: DirectoryEntry) => void   // fires when a directory entry is chosen/added (use to fill Sindhi/Hindi siblings)
  name?: string
  placeholder?: string
  dir?: 'ltr' | 'rtl'
  className?: string
}

const SINDHI_RE = /[؀-ۿ]/

export default function DirectoryInput({
  category, value, onChange, onPick, name, placeholder, dir, className,
}: Props) {
  const [results, setResults] = useState<DirectoryEntry[]>([])
  const [open, setOpen]       = useState(false)
  const [adding, setAdding]   = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const tRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (tRef.current) clearTimeout(tRef.current)
    const q = v.trim()
    if (!q) { setResults([]); setOpen(false); return }
    tRef.current = setTimeout(async () => {
      const r = await searchDirectory(category, q)
      setResults(r)
      setOpen(true)
    }, 200)
  }

  function pick(e: DirectoryEntry) {
    onChange(e.english_word || e.sindhi_word || e.hindi_word || '')
    onPick?.(e)
    setResults([])
    setOpen(false)
  }

  async function addNew() {
    const q = value.trim()
    if (!q) return
    setAdding(true)
    const isSindhi = SINDHI_RE.test(q)
    const { entry } = await upsertDirectoryEntry({
      category,
      english: isSindhi ? null : q,
      sindhi:  isSindhi ? q : null,
      hindi:   null,
    })
    setAdding(false)
    if (entry) onPick?.(entry)
    setOpen(false)
  }

  const exact = results.some(r =>
    [r.english_word, r.sindhi_word, r.hindi_word].some(w => (w ?? '').toLowerCase() === value.trim().toLowerCase())
  )

  return (
    <div className="relative" ref={boxRef}>
      <input
        name={name}
        value={value}
        dir={dir}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true) }}
        className={className}
      />
      {open && (results.length > 0 || (value.trim() && !exact)) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto text-sm">
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => pick(r)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between items-center gap-2"
            >
              <span className="font-medium text-gray-800">{r.english_word || r.sindhi_word}</span>
              <span className="text-gray-400 text-xs truncate">
                {[r.sindhi_word, r.hindi_word].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
          {value.trim() && !exact && (
            <button
              type="button"
              onClick={addNew}
              disabled={adding}
              className="w-full text-left px-3 py-2 text-emerald-700 hover:bg-emerald-50 border-t border-gray-100"
            >
              {adding ? 'Adding…' : `+ Add "${value.trim()}" to directory`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
