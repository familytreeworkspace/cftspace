'use client'

import Link from 'next/link'
import { useState } from 'react'

interface SubCaste { id: string; name: string; count: number }
interface Household {
  id: string
  ghar_number: string
  head_name: string
  head_gender: string
  sub_caste_id: string | null
  education: string | null
  profession: string | null
  current_address: string | null
  village_name: string | null
  member_count?: number
}

export default function HouseholdListClient({
  households,
  subCastes,
  totalCount,
  canAdd,
}: {
  households: Household[]
  subCastes: SubCaste[]
  totalCount: number
  canAdd: boolean
}) {
  const [search, setSearch] = useState('')
  const [selectedSC, setSelectedSC] = useState<string>('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  const scMap = new Map(subCastes.map(s => [s.id, s.name]))

  const filtered = households.filter(h => {
    const matchSC = selectedSC === 'all' || h.sub_caste_id === selectedSC
    const matchSearch =
      !search ||
      (h.head_name ?? (h as any).head_name_sindhi ?? '').toLowerCase().includes(search.toLowerCase()) ||
      h.ghar_number.toLowerCase().includes(search.toLowerCase()) ||
      (h.current_address ?? '').toLowerCase().includes(search.toLowerCase())
    return matchSC && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Sub Caste Filter */}
      <aside className="w-56 flex-shrink-0">
        <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-6">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              🔽 Sub Castes
            </p>
          </div>

          {/* Filter List */}
          <nav className="py-1">
            {/* All option */}
            <button
              onClick={() => {
                setSelectedSC('all')
                setPage(1)
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedSC === 'all'
                  ? 'bg-primary/10 text-primary heritage-gradient-text font-semibold'
                  : 'text-foreground hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>All</span>
                <span className={`text-xs font-semibold ${selectedSC === 'all' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {totalCount}
                </span>
              </div>
            </button>

            {/* Individual sub-castes */}
            {subCastes.map(sc => (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedSC(sc.id)
                  setPage(1)
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  selectedSC === sc.id
                    ? 'bg-primary text-primary-foreground font-semibold rounded-lg mx-2 px-3 w-auto'
                    : 'text-foreground hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{sc.name}</span>
                  <span className={`text-xs font-semibold ${selectedSC === sc.id ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {sc.count}
                  </span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {filtered.length} of {totalCount} shown
              </h2>
            </div>
            {canAdd && (
              <Link
                href="/households/new"
                className="px-4 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                ➕ Add Household
              </Link>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Grid or Empty State */}
        {pageData.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground">No households found.</p>
          </div>
        ) : (
          <>
            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {pageData.map(h => (
                <Link
                  key={h.id}
                  href={`/households/${h.id}`}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  {/* Green Banner with Avatar */}
                  <div className="h-24 heritage-gradient relative">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                      <div className="w-12 h-12 rounded-full heritage-gradient border-4 border-background flex items-center justify-center text-primary-foreground font-bold text-lg shadow">
                        {getInitial(h.head_name)}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-8 px-4 pb-4 text-center">
                    {/* Sub Caste Badge */}
                    {h.sub_caste_id && (
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 bg-muted text-foreground text-xs font-semibold rounded-full">
                          {scMap.get(h.sub_caste_id) ?? '—'}
                        </span>
                      </div>
                    )}

                    {/* Head Name */}
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {h.head_name}
                    </h3>

                    {/* Member Count */}
                    <div className="text-xs text-muted-foreground mt-2">
                      👥 {h.member_count ?? 0} Members
                    </div>

                    {/* Village/Location */}
                    {h.village_name && (
                      <div className="text-xs text-muted-foreground mt-1">
                        📍 {h.village_name}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
