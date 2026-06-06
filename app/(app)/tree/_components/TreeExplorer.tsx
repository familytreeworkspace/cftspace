'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import TreeNodeComponent from '../[id]/_components/TreeNode'
import { getSubCasteTreeData } from '@/app/actions/tree'
import {
  buildHouseholdTree,
  flattenByGeneration,
  type TreeMember,
  type FamilyLink,
} from '@/lib/tree-utils'

interface SubCaste { id: string; name: string; name_sindhi: string | null }

interface HouseholdItem {
  id: string
  ghar_number: string
  head_name: string
  head_gender: string
}

interface HouseholdTree {
  householdId: string
  gharNumber: string
  head: TreeMember
  members: TreeMember[]
  links: FamilyLink[]
}

// ── Mini tree node sizes ──
const NW = 88
const NH = 100
const PAD = 32

// ── Inline compact tree renderer ──
function MiniTree({
  head, members, links, graphicMode,
}: {
  head: TreeMember
  members: TreeMember[]
  links: FamilyLink[]
  graphicMode: boolean
}) {
  const tree = buildHouseholdTree(head, members, links)
  const generations = flattenByGeneration(tree)

  const nodePos = new Map<string, { x: number; y: number }>()
  generations.forEach(gen => {
    gen.forEach((node, ni) => {
      nodePos.set(node.member.id, {
        x: PAD + ni * NW + NW / 2,
        y: PAD + node.generation * NH + NH / 2,
      })
    })
  })

  const svgW = Math.max(300, generations.reduce((m, g) => Math.max(m, g.length), 0) * NW + PAD * 2)
  const svgH = generations.length * NH + PAD * 2

  const lines: React.ReactNode[] = []
  function drawLines(node: typeof tree) {
    const fp = nodePos.get(node.member.id)
    for (const sp of node.spouses) {
      const tp = nodePos.get(sp.member.id)
      if (fp && tp) lines.push(
        <line key={`sp-${node.member.id}-${sp.member.id}`}
          x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
          stroke="#f472b6" strokeWidth="1.5" strokeDasharray="4 2"
        />
      )
    }
    for (const ch of node.children) {
      const tp = nodePos.get(ch.member.id)
      if (fp && tp) {
        const midY = (fp.y + tp.y) / 2
        lines.push(
          <path key={`ch-${node.member.id}-${ch.member.id}`}
            d={`M${fp.x} ${fp.y}L${fp.x} ${midY}L${tp.x} ${midY}L${tp.x} ${tp.y}`}
            stroke="#94a3b8" strokeWidth="1.5" fill="none"
          />
        )
      }
      drawLines(ch)
    }
  }
  drawLines(tree)

  return (
    <div className="overflow-auto">
      <div className="relative inline-block" style={{ width: svgW, height: svgH }}>
        <svg width={svgW} height={svgH} className="absolute top-0 left-0 pointer-events-none">
          {lines}
        </svg>
        {generations.map(gen =>
          gen.map(node => {
            const pos = nodePos.get(node.member.id)
            if (!pos) return null
            return (
              <div key={node.member.id} style={{
                position: 'absolute',
                left: pos.x - NW / 2,
                top:  pos.y - NH / 2,
                width: NW, height: NH,
              }} className="flex items-center justify-center">
                <TreeNodeComponent
                  member={node.member}
                  graphicMode={graphicMode}
                  canEdit={false}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Main explorer ──
export default function TreeExplorer({
  subCastes,
  canEdit,
}: {
  subCastes: SubCaste[]
  canEdit: boolean
}) {
  const [selectedSubCasteId, setSelectedSubCasteId] = useState<string | null>(null)
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null)
  const [households, setHouseholds]   = useState<HouseholdItem[]>([])
  const [allTrees, setAllTrees]       = useState<HouseholdTree[]>([])
  const [graphicMode, setGraphicMode] = useState(true)
  const [zoom, setZoom]               = useState(1.0)
  const [loading, startLoading]       = useTransition()

  const zoomIn    = () => setZoom(z => Math.min(2.0, +(z + 0.1).toFixed(1)))
  const zoomOut   = () => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(1)))
  const zoomReset = () => setZoom(1.0)

  // Refs for scrolling to a specific household tree card
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el)
    else cardRefs.current.delete(id)
  }, [])

  function handleSubCasteClick(scId: string) {
    if (scId === selectedSubCasteId) return
    setSelectedSubCasteId(scId)
    setSelectedHouseholdId(null)
    setAllTrees([])
    setHouseholds([])

    startLoading(async () => {
      const raw = await getSubCasteTreeData(scId)

      const trees: HouseholdTree[] = raw.map(item => ({
        householdId: item.household.id,
        gharNumber:  item.household.ghar_number,
        head: {
          id:            item.household.id,
          name:          item.household.head_name,
          gender:        item.household.head_gender as 'Male' | 'Female',
          relation_code: 'HEAD',
          dob_year:      item.household.dob_year,
          photo_url:     item.household.photo_url,
          sub_caste_id:  item.household.sub_caste_id,
          household_id:  item.household.id,
          is_head:       true,
        },
        members: item.members.map(m => ({
          id:            m.id,
          name:          m.name,
          gender:        m.gender as 'Male' | 'Female',
          relation_code: m.relation_code,
          dob_year:      m.dob_year,
          photo_url:     m.photo_url,
          sub_caste_id:  m.sub_caste_id,
          household_id:  m.household_id,
        })),
        links: item.links.map(l => ({
          id: l.id, member_id: l.member_id,
          father_id: l.father_id, mother_id: l.mother_id,
          spouse_id: l.spouse_id, link_type: l.link_type,
        })),
      }))

      const hList: HouseholdItem[] = raw.map(item => ({
        id:          item.household.id,
        ghar_number: item.household.ghar_number,
        head_name:   item.household.head_name,
        head_gender: item.household.head_gender,
      }))

      setAllTrees(trees)
      setHouseholds(hList)
    })
  }

  function handleHouseholdClick(id: string) {
    setSelectedHouseholdId(id)
    const el = cardRefs.current.get(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectedSubCaste = subCastes.find(s => s.id === selectedSubCasteId)

  return (
    <div className="flex h-full bg-background">

      {/* ── Left: Sub Castes ── */}
      <div className="w-44 flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sub Castes</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subCastes.length} total</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {subCastes.map(sc => (
            <button
              key={sc.id}
              onClick={() => handleSubCasteClick(sc.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors ${
                selectedSubCasteId === sc.id
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <div className="text-sm leading-tight">{sc.name}</div>
              {sc.name_sindhi && (
                <div className="text-[10px] text-muted-foreground mt-0.5" dir="rtl">{sc.name_sindhi}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Center: All Family Trees ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Center toolbar */}
        {allTrees.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-white flex-shrink-0 flex-wrap">
            {/* Graphic / Symbol */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setGraphicMode(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  graphicMode ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >📊 Graphic</button>
              <button
                onClick={() => setGraphicMode(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !graphicMode ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >◆ Symbols</button>
            </div>

            {/* Zoom */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={zoomOut}
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-600 hover:bg-white hover:shadow transition-all text-sm font-bold"
              >−</button>
              <span className="px-2 text-xs font-semibold text-gray-600 min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={zoomIn}
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-600 hover:bg-white hover:shadow transition-all text-sm font-bold"
              >+</button>
              <button onClick={zoomReset}
                className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-white hover:shadow rounded-md transition-all"
              >Reset</button>
            </div>

            <span className="text-xs text-muted-foreground">
              {selectedSubCaste?.name} · {allTrees.length} families
            </span>

            <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 border-t-2 border-dashed border-pink-400" /> Spouse
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 border-t-2 border-slate-400" /> Parent-Child
              </span>
            </div>
          </div>
        )}

        {/* Trees or placeholder */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading all family trees...</p>
            </div>
          ) : allTrees.length > 0 ? (
            <div className="p-4 space-y-4">
              {allTrees.map(tree => (
                <div
                  key={tree.householdId}
                  ref={el => setCardRef(tree.householdId, el)}
                  className={`rounded-xl border-2 overflow-hidden bg-white transition-all ${
                    selectedHouseholdId === tree.householdId
                      ? 'border-primary shadow-md shadow-primary/10'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  {/* Card header */}
                  <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
                    selectedHouseholdId === tree.householdId
                      ? 'bg-primary/8 border-primary/20'
                      : 'bg-muted/30 border-border'
                  }`}>
                    <div>
                      <span className="font-semibold text-sm text-foreground">{tree.head.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">Ghar #{tree.gharNumber}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {tree.members.length + 1} members
                    </span>
                  </div>

                  {/* Tree canvas */}
                  <div className="bg-gray-50 overflow-auto" style={{ maxHeight: '220px' }}>
                    <div style={{ zoom }}>
                      <MiniTree
                        head={tree.head}
                        members={tree.members}
                        links={tree.links}
                        graphicMode={graphicMode}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedSubCasteId ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <span className="text-4xl">🏠</span>
              <p className="text-sm text-muted-foreground">
                No households found in {selectedSubCaste?.name}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <span className="text-5xl">🌳</span>
              <p className="text-base font-semibold text-foreground">Family Tree Explorer</p>
              <p className="text-sm text-muted-foreground">
                Select a sub caste from the left to view all family trees
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Households list ── */}
      <div className="w-52 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex-shrink-0">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Households</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {selectedSubCasteId
              ? loading ? 'Loading...' : `${households.length} families`
              : 'Select sub caste first'}
          </p>
        </div>
        <div className="overflow-y-auto flex-1">
          {!selectedSubCasteId ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Select a sub caste to see households.
            </p>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : households.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No households found.</p>
          ) : (
            households.map((h, i) => (
              <button
                key={h.id}
                onClick={() => handleHouseholdClick(h.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors ${
                  selectedHouseholdId === h.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground mt-0.5 w-5 flex-shrink-0 text-right">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight truncate">{h.head_name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Ghar #{h.ghar_number}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
