'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  searchHouseholdsForMarriage, getHouseholdWives,
  setMaidenLink, setMarriedLink, setExternalMaiden,
} from '@/app/actions/marriage'

export type MarriageLinkTarget = {
  memberId: string
  memberName: string
  householdId: string          // the member's own household (excluded from search)
  mode: 'maika' | 'sasural'
  subCasteId: string
}

interface HouseholdHit {
  id: string
  ghar_number: string
  head_name: string | null
  head_name_sindhi: string | null
  head_father_name: string | null
  orig_village_city: string | null
  curr_village_city: string | null
  original_address: string | null
  current_address: string | null
}

interface Wife { id: string; name: string; name_sindhi: string | null }

interface SubCasteOpt { id: string; name: string }

export default function MarriageModal({
  target, subCastes, onDone, onCancel,
}: {
  target: MarriageLinkTarget
  subCastes: SubCasteOpt[]
  onDone: () => void
  onCancel: () => void
}) {
  const isMaika = target.mode === 'maika'

  const [subCasteId, setSubCasteId] = useState(target.subCasteId || (subCastes[0]?.id ?? ''))
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<HouseholdHit[]>([])
  const [selected, setSelected]     = useState<HouseholdHit | null>(null)
  const [wives, setWives]           = useState<Wife[]>([])
  const [motherId, setMotherId]     = useState<string | null>(null)

  // Outside-community (maika only)
  const [external, setExternal]     = useState(false)
  const [extFather, setExtFather]   = useState('')
  const [extMother, setExtMother]   = useState('')
  const [extSub, setExtSub]         = useState('')
  const [extAddr, setExtAddr]       = useState('')

  const [error, setError]           = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()

  // Search whenever query or sub-caste changes (empty query lists the first households)
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (external || !subCasteId) { if (alive) setResults([]); return }
      const hits = await searchHouseholdsForMarriage(query, subCasteId, target.householdId)
      if (alive) setResults(hits as HouseholdHit[])
    })()
    return () => { alive = false }
  }, [query, subCasteId, external, target.householdId])

  async function selectHousehold(hh: HouseholdHit) {
    setSelected(hh)
    setMotherId(null)
    setWives([])
    if (isMaika) {
      const w = await getHouseholdWives(hh.id)
      setWives(w as Wife[])
    }
  }

  function confirm() {
    setError(null)
    startTransition(async () => {
      let res: { error?: string }
      if (isMaika && external) {
        res = await setExternalMaiden({
          wifeMemberId: target.memberId,
          fatherName: extFather, motherName: extMother,
          subCaste: extSub, address: extAddr,
          householdId: target.householdId,
        })
      } else if (!selected) {
        setError('Please select a family first.'); return
      } else if (isMaika) {
        res = await setMaidenLink({
          wifeMemberId: target.memberId,
          fatherHouseholdId: selected.id,
          motherMemberId: motherId,
          householdId: target.householdId,
        })
      } else {
        res = await setMarriedLink({
          betiMemberId: target.memberId,
          husbandHouseholdId: selected.id,
          householdId: target.householdId,
        })
      }
      if (res.error) { setError(res.error); return }
      onDone()
    })
  }

  const headName = (h: HouseholdHit) => h.head_name || h.head_name_sindhi || '(no name)'
  const canConfirm = isMaika && external ? !!extFather.trim() : !!selected

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] nodrag" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-[94vw] mx-4 max-h-[88vh] flex flex-col overflow-hidden"
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            {isMaika ? "Link Maiden Family (Maika)" : "Link Husband's Family (Sasural)"}
          </div>
          <div className="text-base font-bold text-gray-800">
            {isMaika ? '👪' : '💍'} {target.memberName}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {isMaika ? "Find the household whose head is her father" : "Find the household whose head is her husband"}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto">

          {/* Outside-community toggle (maika only) */}
          {isMaika && (
            <label className="flex items-center gap-2 text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={external}
                onChange={(e) => { setExternal(e.target.checked); setSelected(null) }}
                className="w-4 h-4 accent-amber-600" />
              This family is outside our community (not in the system)
            </label>
          )}

          {isMaika && external ? (
            /* ── Manual form for outside-community maika ── */
            <div className="space-y-2">
              <Field label="Father name *"  value={extFather} onChange={setExtFather} placeholder="Father's name" />
              <Field label="Mother name"    value={extMother} onChange={setExtMother} placeholder="Mother's name" />
              <Field label="Sub-caste"      value={extSub}    onChange={setExtSub}    placeholder="Sub-caste / Nuk" />
              <Field label="Address"        value={extAddr}   onChange={setExtAddr}   placeholder="Village / City" />
            </div>
          ) : (
            /* ── Search within a sub-caste ── */
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sub-caste</label>
                <select value={subCasteId} onChange={(e) => { setSubCasteId(e.target.value); setSelected(null) }}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-400">
                  {subCastes.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Search {isMaika ? 'father' : 'husband'} by name
                </label>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a name…" autoFocus
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* Results */}
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">No families found — try another name or sub-caste.</p>
                ) : results.map(hh => {
                  const sel = selected?.id === hh.id
                  return (
                    <button key={hh.id} onClick={() => selectHousehold(hh)}
                      className={[
                        'w-full text-left px-3 py-2 rounded-xl border transition-colors',
                        sel ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
                      ].join(' ')}>
                      <div className="text-sm font-semibold text-gray-800">
                        {headName(hh)}
                        <span className="text-[10px] font-normal text-gray-400 ml-1.5">Ghar #{hh.ghar_number}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 leading-snug">
                        {hh.head_father_name && <span>s/o {hh.head_father_name} · </span>}
                        {(hh.orig_village_city || hh.original_address) && <span>From {hh.orig_village_city || hh.original_address}</span>}
                        {(hh.curr_village_city || hh.current_address) && <span> · Now {hh.curr_village_city || hh.current_address}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Which mother? (maika, multiple wives) */}
              {isMaika && selected && wives.length > 1 && (
                <div className="bg-pink-50 border border-pink-200 rounded-xl px-3 py-2">
                  <div className="text-xs font-medium text-pink-700 mb-1.5">
                    This father has {wives.length} wives — which one is her mother?
                  </div>
                  <div className="space-y-1">
                    {wives.map(w => (
                      <button key={w.id} onClick={() => setMotherId(w.id)}
                        className={[
                          'w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                          motherId === w.id ? 'border-pink-400 bg-pink-100 text-pink-700' : 'border-gray-200 hover:bg-white',
                        ].join(' ')}>
                        {w.name || w.name_sindhi || '(no name)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={confirm} disabled={!canConfirm || pending}
            className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:bg-blue-300 transition-colors">
            {pending ? 'Saving…' : 'Confirm Link'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400" />
    </div>
  )
}
