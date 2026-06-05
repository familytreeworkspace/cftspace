'use client'

import { useState, useTransition } from 'react'
import { linkMembers, unlinkMembers, searchMembersForLink } from '@/app/actions/tree'
import type { TreeMember, FamilyLink } from '@/lib/tree-utils'

interface SearchResult {
  id: string
  name: string
  gender: string
  relation_code: string
  dob_year: number | null
  household_id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  households: any
}

export default function LinkPanel({
  members,
  links,
  householdId,
  selectedMember,
}: {
  members: TreeMember[]
  links: FamilyLink[]
  householdId: string
  selectedMember: TreeMember | null
}) {
  const [activeTab, setActiveTab]         = useState<'link' | 'existing'>('link')
  const [step, setStep]                   = useState<'select-member' | 'select-target' | 'confirm'>('select-member')
  const [fromMember, setFromMember]       = useState<TreeMember | null>(selectedMember)
  const [linkKind, setLinkKind]           = useState<'father' | 'mother' | 'spouse'>('father')
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [targetMember, setTargetMember]   = useState<SearchResult | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  const memberMap = new Map(members.map(m => [m.id, m]))

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    const results = await searchMembersForLink(q, fromMember?.id ?? '')
    setSearchResults(results as SearchResult[])
  }

  async function handleConfirmLink() {
    if (!fromMember || !targetMember) return
    setError(null)
    startTransition(async () => {
      const result = await linkMembers(fromMember.id, linkKind, targetMember.id, householdId)
      if (result.error) {
        setError(result.error)
      } else {
        setStep('select-member')
        setFromMember(null)
        setTargetMember(null)
        setSearchQuery('')
        setSearchResults([])
      }
    })
  }

  async function handleUnlink(memberId: string, kind: 'father' | 'mother' | 'spouse') {
    setError(null)
    startTransition(async () => {
      const result = await unlinkMembers(memberId, kind, householdId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="p-4">
      <h3 className="font-semibold text-gray-800 mb-3 text-sm">Link Management</h3>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-4">
        <button
          onClick={() => setActiveTab('link')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'link' ? 'bg-white shadow text-blue-700' : 'text-gray-500'
          }`}
        >
          Add Link
        </button>
        <button
          onClick={() => setActiveTab('existing')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'existing' ? 'bg-white shadow text-blue-700' : 'text-gray-500'
          }`}
        >
          Existing Links
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5 mb-3">{error}</p>
      )}

      {activeTab === 'link' && (
        <div className="space-y-4">
          {/* Step 1: Choose member from this household */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              1. Select member
            </label>
            <select
              value={fromMember?.id ?? ''}
              onChange={e => {
                const m = memberMap.get(e.target.value)
                setFromMember(m ?? null)
              }}
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Choose member —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.relation_code})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Link kind */}
          {fromMember && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                2. Link kind
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['father', 'mother', 'spouse'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => setLinkKind(k)}
                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors capitalize ${
                      linkKind === k
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Set {fromMember.name}&apos;s {linkKind}
              </p>
            </div>
          )}

          {/* Step 3: Search target */}
          {fromMember && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                3. Search target person
              </label>
              <input
                type="search"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Type name to search..."
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Within-household quick select */}
              {!searchQuery && (
                <div className="mt-1.5 space-y-1">
                  <p className="text-[10px] text-gray-400">This household:</p>
                  {members.filter(m => m.id !== fromMember.id).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setTargetMember({
                        id: m.id, name: m.name, gender: m.gender,
                        relation_code: m.relation_code, dob_year: m.dob_year,
                        household_id: householdId, households: null,
                      })}
                      className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        targetMember?.id === m.id
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {m.name} <span className="text-gray-400">({m.relation_code})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mt-1.5 space-y-1 max-h-36 overflow-y-auto">
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setTargetMember(r); setSearchResults([]) }}
                      className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        targetMember?.id === r.id
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{r.name}</span>
                      <span className="text-gray-400 ml-1 text-[10px]">
                        Ghar {r.households?.ghar_number ?? '?'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Confirm button */}
          {fromMember && targetMember && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-700">
                <strong>{fromMember.name}</strong>&apos;s {linkKind} = <strong>{targetMember.name}</strong>
              </p>
              <button
                onClick={handleConfirmLink}
                disabled={isPending}
                className="w-full py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:bg-blue-400"
              >
                {isPending ? 'Saving...' : 'Confirm Link'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'existing' && (
        <div className="space-y-3">
          {links.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No links defined yet.</p>
          ) : (
            links.map(link => {
              const member = memberMap.get(link.member_id)
              return (
                <div key={link.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                  <div className="font-medium text-gray-800 mb-2">{member?.name ?? link.member_id}</div>
                  <div className="space-y-1">
                    {link.father_id && (
                      <LinkRow
                        label="Father"
                        targetName={memberMap.get(link.father_id)?.name ?? link.father_id}
                        onRemove={() => handleUnlink(link.member_id, 'father')}
                        isPending={isPending}
                      />
                    )}
                    {link.mother_id && (
                      <LinkRow
                        label="Mother"
                        targetName={memberMap.get(link.mother_id)?.name ?? link.mother_id}
                        onRemove={() => handleUnlink(link.member_id, 'mother')}
                        isPending={isPending}
                      />
                    )}
                    {link.spouse_id && (
                      <LinkRow
                        label="Spouse"
                        targetName={memberMap.get(link.spouse_id)?.name ?? link.spouse_id}
                        onRemove={() => handleUnlink(link.member_id, 'spouse')}
                        isPending={isPending}
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function LinkRow({
  label,
  targetName,
  onRemove,
  isPending,
}: {
  label: string
  targetName: string
  onRemove: () => void
  isPending: boolean
}) {
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">
        <span className="text-gray-400">{label}:</span> {targetName}
      </span>
      {confirm ? (
        <div className="flex gap-1">
          <button
            onClick={onRemove}
            disabled={isPending}
            className="text-red-600 font-medium hover:underline disabled:opacity-50"
          >
            {isPending ? '...' : 'Remove'}
          </button>
          <button onClick={() => setConfirm(false)} className="text-gray-400 hover:underline">cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} className="text-gray-400 hover:text-red-500">✕</button>
      )}
    </div>
  )
}
