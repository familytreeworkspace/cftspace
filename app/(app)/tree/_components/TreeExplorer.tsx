'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { getSubCasteTreeData } from '@/app/actions/tree'
import { logout } from '@/app/actions/auth'
import type { HouseholdTree, CrossHouseholdLink } from './types'
import type { TreeMember } from '@/lib/tree-utils'

const TreeCanvas = dynamic(() => import('./TreeCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

interface SubCaste { id: string; name: string; name_sindhi: string | null }

export default function TreeExplorer({
  subCastes,
  canEdit,
  isViewer = false,
  userName = '',
}: {
  subCastes: SubCaste[]
  canEdit: boolean
  isViewer?: boolean
  userName?: string
}) {
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [allTrees, setAllTrees]       = useState<HouseholdTree[]>([])
  const [crossLinks, setCrossLinks]   = useState<CrossHouseholdLink[]>([])
  const [positions, setPositions]     = useState<{ node_id: string; x: number; y: number }[]>([])
  const [loading, startLoading]       = useTransition()
  const [search, setSearch]           = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // Mobile search-icon cycle:
  //  • overlay open            → close it (search results stay on screen)
  //  • overlay closed + active  → clear the search (tree refreshes to show all)
  //  • overlay closed + empty   → open the overlay
  function toggleMobileSearch() {
    if (mobileSearchOpen) {
      setMobileSearchOpen(false)
    } else if (search.trim()) {
      setSearch('')
    } else {
      setMobileSearchOpen(true)
    }
  }

  function loadSubCaste(scId: string) {
    setSelectedId(scId)
    setAllTrees([])
    setCrossLinks([])
    setSearch('')
    setMobileSearchOpen(false)
    startLoading(async () => {
      const { trees: raw, crossLinks: cl, positions: pos } = await getSubCasteTreeData(scId)
      setPositions(pos ?? [])

      const trees: HouseholdTree[] = raw.map(item => ({
        householdId:    item.household.id,
        gharNumber:     item.household.ghar_number,
        headFatherName: (item.household as any).head_father_name ?? null,
        isVirtual:      (item.household as any).is_virtual ?? false,
        head: {
          id:            item.household.id,
          // head_name (English) may be empty until Directory backfill runs — fall back to Sindhi
          name:          item.household.head_name || (item.household as any).head_name_sindhi || '',
          gender:        item.household.head_gender as 'Male' | 'Female',
          relation_code: 'HEAD',
          dob_year:      item.household.dob_year,
          death_year:    (item.household as any).death_year ?? null,
          photo_url:     item.household.photo_url,
          sub_caste_id:  item.household.sub_caste_id,
          household_id:  item.household.id,
          is_head:       true,
        } as TreeMember,
        members: item.members.map(m => ({
          id:            m.id,
          // name (English) may be empty until Directory backfill — fall back to Sindhi
          name:          m.name || (m as any).name_sindhi || '',
          gender:        m.gender as 'Male' | 'Female',
          relation_code: m.relation_code,
          dob_year:      m.dob_year,
          death_year:    (m as any).death_year ?? null,
          photo_url:     m.photo_url,
          sub_caste_id:  m.sub_caste_id,
          household_id:  m.household_id,
        }) as TreeMember),
        links: item.links.map(l => ({
          id:        l.id,
          member_id: l.member_id,
          father_id: l.father_id,
          mother_id: l.mother_id,
          spouse_id: l.spouse_id,
          link_type: l.link_type,
        })),
      }))

      setAllTrees(trees)
      setCrossLinks(cl as CrossHouseholdLink[])
    })
  }

  function handleTreeUpdated() {
    if (selectedId) loadSubCaste(selectedId)
  }

  const selectedSC = subCastes.find(s => s.id === selectedId)

  // Households that directly match the search text
  const matchHhIds = (() => {
    if (!search.trim()) return null
    const q = search.trim().toLowerCase()
    return new Set(
      allTrees
        .filter(t =>
          t.head.name.toLowerCase().includes(q) ||
          t.gharNumber.toLowerCase().includes(q) ||
          t.members.some(m => m.name.toLowerCase().includes(q))
        )
        .map(t => t.householdId)
    )
  })()

  // Show only the matching families. Keep cross-links that stay WITHIN the matched set so a
  // matched child still renders (as its own root) instead of vanishing with its missing parent.
  const filteredTrees = matchHhIds
    ? allTrees.filter(t => matchHhIds.has(t.householdId))
    : allTrees

  const visibleHhIds = new Set(filteredTrees.map(t => t.householdId))
  const visibleCrossLinks = matchHhIds
    ? crossLinks.filter(cl => visibleHhIds.has(cl.child_household_id) && visibleHhIds.has(cl.parent_household_id))
    : crossLinks

  const totalHouseholds = allTrees.filter(t => !t.isVirtual).length
  const matchCount = matchHhIds ? matchHhIds.size : null

  return (
    <div className="relative flex flex-col h-full bg-slate-50">

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">

        {/* Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg">🌳</span>
          <div>
            <div className="text-sm font-bold text-gray-800 leading-tight">Family Tree</div>
            {selectedSC && (
              <div className="text-[10px] text-gray-400 leading-tight">{selectedSC.name}</div>
            )}
          </div>
        </div>

        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

        {/* Sub Caste selector — placeholder shown inside the dropdown, no separate label */}
        <select
          value={selectedId ?? ''}
          onChange={e => e.target.value && loadSubCaste(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px] flex-shrink-0"
        >
          <option value="">Sub Caste</option>
          {subCastes.map(sc => (
            <option key={sc.id} value={sc.id}>{sc.name}</option>
          ))}
        </select>

        {/* Search */}
        {selectedId && allTrees.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

            {/* Desktop: inline search box */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search any name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg pl-8 pr-8 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400 w-48"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    ×
                  </button>
                )}
              </div>
              {matchCount !== null && (
                <span className={[
                  'text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                  matchCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-50 text-red-500',
                ].join(' ')}>
                  {matchCount} {matchCount === 1 ? 'family' : 'families'}
                </span>
              )}
            </div>

            {/* Mobile: search icon toggle */}
            <button
              onClick={toggleMobileSearch}
              aria-label="Search"
              className={[
                'sm:hidden flex items-center justify-center w-9 h-9 rounded-lg border flex-shrink-0 transition-colors',
                mobileSearchOpen || search.trim()
                  ? 'border-blue-400 bg-blue-50 text-blue-600'
                  : 'border-gray-200 bg-white text-gray-500 active:bg-gray-100',
              ].join(' ')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </>
        )}

        {/* Stats — desktop only (mobile shows tiny stats bottom-left over the canvas) */}
        {selectedId && !loading && allTrees.length > 0 && (
          <>
            <div className="hidden sm:block w-px h-8 bg-gray-200 flex-shrink-0" />
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                {totalHouseholds} Households
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                {allTrees.reduce((s, t) => s + t.members.length + 1, 0)} Members
              </span>
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User info + Logout (always visible for viewer, optional for others) */}
        {isViewer && (
          <>
            <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-xs font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-600 font-medium max-w-[100px] truncate">
                  {userName}
                </span>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  Logout
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ── Mobile Search Overlay (top-center, semi-transparent) ── */}
      {mobileSearchOpen && selectedId && allTrees.length > 0 && (
        <div className="sm:hidden absolute top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
          <div className="relative bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg px-2 py-2">
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Search any name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-9 py-2 bg-white/90 outline-none focus:ring-2 focus:ring-blue-400"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
            {matchCount !== null && (
              <div className="mt-1.5 flex justify-center">
                <span className={[
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  matchCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-50 text-red-500',
                ].join(' ')}>
                  {matchCount} {matchCount === 1 ? 'family' : 'families'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Canvas Area ── */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">
              Loading {selectedSC?.name} family trees…
            </p>
          </div>

        ) : !selectedId ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
              <span className="text-4xl">🌳</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Family Tree Explorer</p>
              <p className="text-sm text-gray-400 mt-1">
                Select a Sub Caste above to view all family trees
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-sm">
              {subCastes.slice(0, 6).map(sc => (
                <button
                  key={sc.id}
                  onClick={() => loadSubCaste(sc.id)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm"
                >
                  {sc.name}
                </button>
              ))}
            </div>
          </div>

        ) : allTrees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-4xl">🏠</span>
            <p className="text-sm text-gray-500">No households found in {selectedSC?.name}</p>
          </div>

        ) : filteredTrees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-base font-medium text-gray-600">No match for "{search}"</p>
            <p className="text-sm text-gray-400">Try a different name or part of a name</p>
            <button
              onClick={() => setSearch('')}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              Clear search — show all {totalHouseholds} families
            </button>
          </div>

        ) : (
          <TreeCanvas
            allTrees={filteredTrees}
            canEdit={canEdit}
            crossLinks={visibleCrossLinks}
            subCasteId={selectedId!}
            positions={matchHhIds ? [] : positions}
            searchTerm={search}
            onTreeUpdated={handleTreeUpdated}
          />
        )}

        {/* Mobile-only tiny stats — transparent, no background, bottom-left above the Symbols/Photos bar */}
        {selectedId && !loading && allTrees.length > 0 && filteredTrees.length > 0 && (
          <div className="sm:hidden absolute left-3 bottom-16 z-40 text-xs font-bold leading-tight text-gray-400 pointer-events-none">
            <div>{totalHouseholds} Households</div>
            <div>{allTrees.reduce((s, t) => s + t.members.length + 1, 0)} Members</div>
          </div>
        )}
      </div>

    </div>
  )
}
