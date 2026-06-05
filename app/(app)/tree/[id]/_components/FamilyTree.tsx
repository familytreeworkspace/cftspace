'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import TreeNodeComponent from './TreeNode'
import LinkPanel from './LinkPanel'
import {
  buildHouseholdTree,
  flattenByGeneration,
  type TreeMember,
  type FamilyLink,
  type TreeNode,
} from '@/lib/tree-utils'

interface Props {
  head: TreeMember
  members: TreeMember[]
  links: FamilyLink[]
  householdId: string
  canEdit: boolean
}

const NODE_W  = 100  // px per node slot
const NODE_H  = 110  // px per generation row
const PADDING = 40

export default function FamilyTree({ head, members, links, householdId, canEdit }: Props) {
  const [graphicMode, setGraphicMode]   = useState(true)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [dragFromId, setDragFromId]     = useState<string | null>(null)
  const [dragOverId, setDragOverId]     = useState<string | null>(null)
  const [confirmLink, setConfirmLink]   = useState<{ from: string; to: string } | null>(null)
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [isMobile, setIsMobile]         = useState(false)
  const canvasRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const allMembers = [head, ...members]
  const memberMap  = new Map(allMembers.map(m => [m.id, m]))

  const tree       = buildHouseholdTree(head, members, links)
  const generations = flattenByGeneration(tree)

  // Assign x positions per generation
  const nodePositions = new Map<string, { x: number; y: number }>()
  generations.forEach((gen, gi) => {
    const totalW = gen.length * NODE_W
    gen.forEach((node, ni) => {
      nodePositions.set(node.member.id, {
        x: PADDING + ni * NODE_W + NODE_W / 2,
        y: PADDING + gi * NODE_H + NODE_H / 2,
      })
    })
  })

  const svgW = Math.max(400, (Math.max(...generations.map(g => g.length)) * NODE_W) + PADDING * 2)
  const svgH = (generations.length * NODE_H) + PADDING * 2

  // Draw SVG lines
  const lines: React.ReactNode[] = []
  function drawLines(node: TreeNode) {
    const fromPos = nodePositions.get(node.member.id)

    // Spouse lines (horizontal)
    for (const spouse of node.spouses) {
      const toPos = nodePositions.get(spouse.member.id)
      if (fromPos && toPos) {
        lines.push(
          <line key={`sp-${node.member.id}-${spouse.member.id}`}
            x1={fromPos.x} y1={fromPos.y}
            x2={toPos.x}   y2={toPos.y}
            stroke="#f472b6" strokeWidth="2" strokeDasharray="4 2"
          />
        )
      }
    }

    // Parent-child lines (vertical)
    for (const child of node.children) {
      const toPos = nodePositions.get(child.member.id)
      if (fromPos && toPos) {
        const midY = (fromPos.y + toPos.y) / 2
        lines.push(
          <path key={`ch-${node.member.id}-${child.member.id}`}
            d={`M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${midY} L ${toPos.x} ${midY} L ${toPos.x} ${toPos.y}`}
            stroke="#94a3b8" strokeWidth="1.5" fill="none"
          />
        )
      }
      drawLines(child)
    }
  }
  drawLines(tree)

  // Drag & drop
  function handleDragStart(id: string) {
    if (!canEdit) return
    setDragFromId(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    if (dragFromId && id !== dragFromId) setDragOverId(id)
  }

  function handleDrop(targetId: string) {
    if (dragFromId && dragFromId !== targetId) {
      setConfirmLink({ from: dragFromId, to: targetId })
    }
    setDragFromId(null)
    setDragOverId(null)
  }

  function handleDragEnd() {
    setDragFromId(null)
    setDragOverId(null)
  }

  const selectedMember = selectedId ? memberMap.get(selectedId) : null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-wrap">
        {/* Graphic / Non-Graphic toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setGraphicMode(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              graphicMode ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Graphic Mode
          </button>
          <button
            onClick={() => setGraphicMode(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              !graphicMode ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Symbol Mode
          </button>
        </div>

        <div className="text-xs text-gray-400 hidden sm:block">
          {allMembers.length} members · {links.length} links
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-pink-400 inline-block" style={{ borderTop: '2px dashed #f472b6' }} />
            Spouse
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-slate-400 inline-block" />
            Parent-Child
          </span>
        </div>

        {/* Admin: link button (mobile) */}
        {canEdit && isMobile && (
          <button
            onClick={() => setShowLinkPanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-700 text-white rounded-lg"
          >
            🔗 Link Members
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tree canvas */}
        <div
          className="flex-1 overflow-auto bg-gray-50 relative"
          onDragEnd={handleDragEnd}
        >
          <div className="relative inline-block min-w-full">
            {/* SVG connection lines */}
            <svg
              ref={canvasRef}
              width={svgW}
              height={svgH}
              className="absolute top-0 left-0 pointer-events-none"
            >
              {lines}
            </svg>

            {/* Generation rows */}
            <div style={{ width: svgW, height: svgH, position: 'relative' }}>
              {generations.map((gen, gi) =>
                gen.map(node => {
                  const pos = nodePositions.get(node.member.id)
                  if (!pos) return null
                  return (
                    <div
                      key={node.member.id}
                      style={{
                        position: 'absolute',
                        left: pos.x - NODE_W / 2,
                        top:  pos.y - NODE_H / 2,
                        width: NODE_W,
                        height: NODE_H,
                      }}
                      className="flex items-center justify-center group"
                    >
                      <TreeNodeComponent
                        member={node.member}
                        graphicMode={graphicMode}
                        isSelected={selectedId === node.member.id}
                        isDragOver={dragOverId === node.member.id}
                        canEdit={canEdit}
                        onSelect={setSelectedId}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Desktop: Link panel sidebar */}
        {canEdit && !isMobile && (
          <div className="w-64 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
            <LinkPanel
              members={allMembers}
              links={links}
              householdId={householdId}
              selectedMember={selectedMember ?? null}
            />
          </div>
        )}
      </div>

      {/* Drag & drop confirm dialog */}
      {confirmLink && (
        <ConfirmLinkDialog
          fromMember={memberMap.get(confirmLink.from) ?? null}
          toMember={memberMap.get(confirmLink.to) ?? null}
          householdId={householdId}
          onClose={() => setConfirmLink(null)}
        />
      )}

      {/* Mobile link panel modal */}
      {showLinkPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-800">Link Members</span>
              <button onClick={() => setShowLinkPanel(false)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            <LinkPanel
              members={allMembers}
              links={links}
              householdId={householdId}
              selectedMember={null}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Confirm Link Dialog ----
function ConfirmLinkDialog({
  fromMember,
  toMember,
  householdId,
  onClose,
}: {
  fromMember: TreeMember | null
  toMember: TreeMember | null
  householdId: string
  onClose: () => void
}) {
  const [linkKind, setLinkKind] = useState<'father' | 'mother' | 'spouse'>('father')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleConfirm() {
    if (!fromMember || !toMember) return
    setLoading(true)
    setError(null)
    const { linkMembers } = await import('@/app/actions/tree')
    const result = await linkMembers(fromMember.id, linkKind, toMember.id, householdId)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Confirm Link</h3>

        <div className="flex items-center gap-3 mb-5 bg-gray-50 rounded-lg p-3">
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500">From</div>
            <div className="font-medium text-gray-800 text-sm">{fromMember?.name}</div>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500">To</div>
            <div className="font-medium text-gray-800 text-sm">{toMember?.name}</div>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Link type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['father', 'mother', 'spouse'] as const).map(k => (
              <button
                key={k}
                onClick={() => setLinkKind(k)}
                className={`py-2 text-xs font-medium rounded-lg border transition-colors capitalize ${
                  linkKind === k
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {toMember?.name?.split(' ')[0]} is {k === 'father' ? "Father" : k === 'mother' ? 'Mother' : 'Spouse'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {fromMember?.name}&apos;s {linkKind} is {toMember?.name}
          </p>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:bg-blue-400"
          >
            {loading ? 'Linking...' : 'Confirm Link'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
