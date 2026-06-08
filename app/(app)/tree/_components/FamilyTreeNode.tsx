'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export type FamilyNodeData = {
  id: string
  name: string
  gender: 'Male' | 'Female'
  dobYear: number | null
  dobDeathYear?: number | null
  photoUrl: string | null
  relationLabel: string
  graphicMode: boolean
  canEdit: boolean
  linkMode: boolean
  isRoot: boolean       // topmost known ancestor → show top "+"
  isHead: boolean
  isLinkedChild?: boolean   // this household is linked under a parent household
  householdId: string
  onAddRelative: (nodeId: string, position: 'top' | 'bottom') => void
  onUnlink?: (householdId: string) => void
  onMarkDeath?: (id: string, isHead: boolean, year: number | null) => void
}

const MALE_BG   = '#eff6ff'   // blue-50
const MALE_BOR  = '#3b82f6'   // blue-500
const FEM_BG    = '#fdf2f8'   // pink-50
const FEM_BOR   = '#ec4899'   // pink-500
const DEAD_BG   = '#cbd5e1'   // slate-300 — clearly visible grey
const DEAD_BOR  = '#64748b'   // slate-500

// Black silhouette SVGs — male standing figure, female dress figure
function MaleSymbol({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.9} viewBox="0 0 40 76" fill="black">
      {/* Head */}
      <circle cx="20" cy="8" r="8" />
      {/* Body */}
      <path d="M11 20 C11 18 29 18 29 20 L29 48 L11 48 Z" />
      {/* Left leg */}
      <rect x="11" y="46" width="8" height="22" rx="3" />
      {/* Right leg */}
      <rect x="21" y="46" width="8" height="22" rx="3" />
      {/* Left arm */}
      <rect x="4" y="20" width="7" height="18" rx="3" />
      {/* Right arm */}
      <rect x="29" y="20" width="7" height="18" rx="3" />
    </svg>
  )
}

function FemaleSymbol({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.9} viewBox="0 0 40 76" fill="black">
      {/* Head */}
      <circle cx="20" cy="9" r="8" />
      {/* Dress — triangular A-line skirt, narrow at shoulders, wide at hem */}
      <path d="M13 19 L27 19 L37 54 L3 54 Z" />
      {/* Left leg */}
      <rect x="14" y="53" width="5" height="18" rx="2" />
      {/* Right leg */}
      <rect x="21" y="53" width="5" height="18" rx="2" />
    </svg>
  )
}

function AddMenu({
  position,
  nodeId,
  onAdd,
  onClose,
}: {
  position: 'top' | 'bottom'
  nodeId: string
  onAdd: (nodeId: string, pos: 'top' | 'bottom', type: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  const topOptions    = ['Add Father', 'Add Mother', 'Add Brother', 'Add Sister']
  const bottomOptions = ['Add Spouse', 'Add Child', 'Add Brother', 'Add Sister', 'Mark Deceased']
  const options = position === 'top' ? topOptions : bottomOptions

  return (
    <div
      ref={ref}
      className={[
        'absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px]',
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        'left-1/2 -translate-x-1/2',
      ].join(' ')}
    >
      {options.map(opt => (
        <button
          key={opt}
          onClick={(e) => { e.stopPropagation(); onAdd(nodeId, position, opt) }}
          className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export const FamilyTreeNode = memo(function FamilyTreeNode({ data, selected }: NodeProps) {
  const d = data as FamilyNodeData
  const [topMenu, setTopMenu]       = useState(false)
  const [bottomMenu, setBottomMenu] = useState(false)
  const [deathModal, setDeathModal] = useState(false)

  const isDeceased = !!(d.dobDeathYear)
  const bg  = isDeceased ? DEAD_BG  : d.gender === 'Female' ? FEM_BG  : MALE_BG
  const bor = isDeceased ? DEAD_BOR : d.gender === 'Female' ? FEM_BOR : MALE_BOR
  const symbolSize = 22

  function handleAdd(nodeId: string, pos: 'top' | 'bottom', type: string) {
    setTopMenu(false)
    setBottomMenu(false)
    if (type === 'Mark Deceased') { setDeathModal(true); return }
    d.onAddRelative(nodeId, pos)
  }

  return (
    <div className="relative flex flex-col items-center" style={{ userSelect: 'none' }}>

      {/* Top "+" — absolutely positioned so it floats above the card without pushing it down */}
      {d.canEdit && d.isRoot && (
        <div className="absolute left-1/2 -translate-x-1/2 z-10 nodrag" style={{ top: '-26px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setTopMenu(v => !v); setBottomMenu(false) }}
            className="w-5 h-5 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center hover:bg-blue-600 shadow transition-colors"
            title="Add above"
          >
            +
          </button>
          {topMenu && (
            <AddMenu position="top" nodeId={d.id} onAdd={handleAdd} onClose={() => setTopMenu(false)} />
          )}
        </div>
      )}

      {/* Handles */}
      {/* Top — parent-child target */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{
          background: d.linkMode ? '#3b82f6' : 'transparent',
          border: d.linkMode ? '2px solid white' : 'none',
          width: 10, height: 10,
          opacity: d.linkMode ? 1 : 0,
          pointerEvents: d.linkMode ? 'auto' : 'none',
        }}
      />
      {/* Right — spouse source (husband right side), at card vertical centre = 53px */}
      <Handle
        id="spouse-r"
        type="source"
        position={Position.Right}
        style={{ background: 'transparent', border: 'none', width: 0, height: 0, top: '53px' }}
      />
      {/* Left — spouse target (wife left side), at card vertical centre = 53px */}
      <Handle
        id="spouse-l"
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 0, height: 0, top: '53px' }}
      />

      {/* Card */}
      <div
        style={{
          width: 120,
          background: bg,
          border: `2px solid ${selected ? '#f97316' : bor}`,
          borderRadius: 10,
          boxShadow: selected ? '0 0 0 3px #fed7aa' : '0 2px 6px rgba(0,0,0,0.08)',
          opacity: isDeceased ? 0.7 : 1,
          position: 'relative',
          overflow: 'hidden',
        }}
        className="flex flex-col items-center py-2 px-1 gap-1"
      >
        {/* Deceased X overlay */}
        {isDeceased && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-15">
              <line x1="0" y1="0" x2="100" y2="100" stroke="#64748b" strokeWidth="6" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="#64748b" strokeWidth="6" />
            </svg>
          </div>
        )}

        {/* Photo or Symbol */}
        <div
          style={{
            width: 44, height: 44,
            borderRadius: '50%',
            border: `2px solid ${bor}`,
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}
        >
          {d.graphicMode && d.photoUrl ? (
            <img src={d.photoUrl} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : d.gender === 'Female' ? (
            <FemaleSymbol size={symbolSize} />
          ) : (
            <MaleSymbol size={symbolSize} />
          )}
        </div>

        {/* Name */}
        <div className="text-center w-full px-1">
          <div className="text-[11px] font-semibold text-gray-800 leading-tight truncate">
            {d.name}
          </div>
          {/* Birth / Death year */}
          <div className="text-[9px] text-gray-400 mt-0.5">
            {d.dobYear ? (isDeceased ? `${d.dobYear} – ${d.dobDeathYear}` : `${d.dobYear} –`) : ''}
          </div>
          {/* Relation label */}
          <div
            className="text-[9px] font-medium mt-0.5 px-1.5 py-0.5 rounded-full inline-block"
            style={{ background: bor + '22', color: bor }}
          >
            {d.relationLabel}
          </div>
        </div>
      </div>

      {/* Bottom — parent-child source */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        style={{
          background: d.linkMode ? '#3b82f6' : 'transparent',
          border: d.linkMode ? '2px solid white' : 'none',
          width: 10, height: 10,
          opacity: d.linkMode ? 1 : 0,
          pointerEvents: d.linkMode ? 'auto' : 'none',
        }}
      />

      {/* Unlink button — top-left, only for linked child households while in Link Mode */}
      {d.canEdit && d.linkMode && d.isLinkedChild && (
        <div className="absolute z-30 nodrag" style={{ top: 4, left: 'calc(50% - 60px + 4px)' }}>
          <button
            onClick={(e) => { e.stopPropagation(); d.onUnlink?.(d.householdId) }}
            className="w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 shadow transition-colors"
            title="Unlink from parent family"
          >
            ✕
          </button>
        </div>
      )}

      {/* "+" add button — top-right corner of the card */}
      {d.canEdit && (
        <div className="absolute z-30 nodrag" style={{ top: 4, right: 'calc(50% - 60px + 4px)' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setBottomMenu(v => !v); setTopMenu(false) }}
            className="w-5 h-5 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center hover:bg-emerald-600 shadow transition-colors"
            title="Add relative"
          >
            +
          </button>
          {bottomMenu && (
            <AddMenu position="bottom" nodeId={d.id} onAdd={handleAdd} onClose={() => setBottomMenu(false)} />
          )}
        </div>
      )}

      {deathModal && (
        <DeathModal
          name={d.name}
          currentYear={d.dobDeathYear ?? null}
          onSave={(year) => { d.onMarkDeath?.(d.id, d.isHead, year); setDeathModal(false) }}
          onClose={() => setDeathModal(false)}
        />
      )}

    </div>
  )
})

// ── Death year modal ──────────────────────────────────────────
function DeathModal({
  name, currentYear, onSave, onClose,
}: {
  name: string
  currentYear: number | null
  onSave: (year: number | null) => void
  onClose: () => void
}) {
  const [year, setYear] = useState(currentYear ? String(currentYear) : '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const y = year.trim() ? parseInt(year) : null
    if (year.trim() && (isNaN(y!) || y! < 1800 || y! > new Date().getFullYear())) return
    onSave(y)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] nodrag"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[340px] max-w-full mx-4"
           onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 text-base mb-1">Mark Deceased</h3>
        <p className="text-xs text-gray-500 mb-4">
          <span className="font-medium text-gray-700">{name}</span> — enter year of death
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="e.g. 2010"
            min={1800}
            max={new Date().getFullYear()}
            autoFocus
          />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            {currentYear && (
              <button type="button" onClick={() => onSave(null)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                Mark Alive
              </button>
            )}
            <button type="submit"
              className="flex-1 py-2.5 text-sm bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
