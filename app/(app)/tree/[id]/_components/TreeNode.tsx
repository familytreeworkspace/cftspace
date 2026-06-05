'use client'

import { getAgeCategory, type TreeMember } from '@/lib/tree-utils'

interface TreeNodeProps {
  member: TreeMember
  graphicMode: boolean
  isSelected?: boolean
  isDragOver?: boolean
  canEdit?: boolean
  onSelect?: (id: string) => void
  onDragStart?: (id: string) => void
  onDragOver?: (e: React.DragEvent, id: string) => void
  onDrop?: (targetId: string) => void
}

export default function TreeNodeComponent({
  member,
  graphicMode,
  isSelected,
  isDragOver,
  canEdit,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
}: TreeNodeProps) {
  const ageCategory = getAgeCategory(member.dob_year)
  const currentYear = new Date().getFullYear()
  const age = member.dob_year ? currentYear - member.dob_year : null

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(member.id)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver?.(e, member.id)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    onDrop?.(member.id)
  }

  const nodeClasses = [
    'flex flex-col items-center gap-1 cursor-pointer select-none transition-all',
    isSelected  ? 'scale-110' : 'hover:scale-105',
    isDragOver  ? 'opacity-70' : '',
  ].join(' ')

  return (
    <div
      className={nodeClasses}
      draggable={canEdit}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => onSelect?.(member.id)}
    >
      {/* Avatar / Symbol */}
      <div className={[
        'relative flex items-center justify-center rounded-full border-2 transition-colors',
        graphicMode ? 'w-16 h-16' : 'w-12 h-12',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-300'
          : member.gender === 'Female'
            ? 'border-pink-300'
            : 'border-blue-300',
        'bg-white shadow-sm',
      ].join(' ')}>
        {graphicMode && member.photo_url ? (
          // Photo
          <img
            src={member.photo_url}
            alt={member.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          // Age/gender symbol
          <Symbol
            gender={member.gender as 'Male' | 'Female'}
            ageCategory={ageCategory}
            graphicMode={graphicMode}
          />
        )}

        {/* Gender indicator dot */}
        <span className={[
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white text-[8px] flex items-center justify-center',
          member.gender === 'Female' ? 'bg-pink-400' : 'bg-blue-400',
        ].join(' ')} />
      </div>

      {/* Name */}
      <div className="text-center max-w-[80px]">
        <div className="text-xs font-medium text-gray-800 leading-tight truncate">
          {member.name}
        </div>
        {member.dob_year && (
          <div className="text-[10px] text-gray-400">{member.dob_year}</div>
        )}
      </div>

      {/* Drag hint */}
      {canEdit && (
        <div className="text-[9px] text-gray-300 opacity-0 group-hover:opacity-100">
          drag to link
        </div>
      )}
    </div>
  )
}

// SVG symbols per age/gender
function Symbol({
  gender,
  ageCategory,
  graphicMode,
}: {
  gender: 'Male' | 'Female'
  ageCategory: 'child' | 'adult' | 'elder' | 'unknown'
  graphicMode: boolean
}) {
  const size  = graphicMode ? 36 : 28
  const color = gender === 'Female' ? '#e879a0' : '#3b82f6'

  if (ageCategory === 'child') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Child — small figure */}
        <circle cx="12" cy="6" r="3" fill={color} opacity="0.9" />
        <path d="M12 9 L10 15 L12 14 L14 15 L12 9Z" fill={color} opacity="0.8" />
        <path d="M10 15 L8 20 M14 15 L16 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 11 L7 13 M15 11 L17 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (ageCategory === 'elder') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Elder — figure with cane */}
        <circle cx="12" cy="5" r="3" fill={color} opacity="0.9" />
        <path d="M12 8 L10 14 L12 13 L14 14 L12 8Z" fill={color} opacity="0.8" />
        <path d="M10 14 L9 20 M14 14 L13 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 10 L7 12 M15 10 L16 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Cane */}
        <path d="M13 20 L16 17 L16 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  // Adult (default)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="3.5" fill={color} opacity="0.9" />
      {gender === 'Female' ? (
        <>
          {/* Female adult — dress silhouette */}
          <path d="M12 9 C9 9 8 12 8 15 L9 15 L9 20 L15 20 L15 15 L16 15 C16 12 15 9 12 9Z" fill={color} opacity="0.75" />
          <path d="M9 11 L7 13 M15 11 L17 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Male adult — standing figure */}
          <path d="M12 9 L10 15 L11.5 15 L11.5 20 L12.5 20 L12.5 15 L14 15 L12 9Z" fill={color} opacity="0.8" />
          <path d="M9 10.5 L7 13 M15 10.5 L17 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
