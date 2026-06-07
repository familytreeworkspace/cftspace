'use client'

import { useTranslations } from 'next-intl'
import { getAgeCategory, type TreeMember } from '@/lib/tree-utils'

// Sindhi relation code sets — same as tree-utils
const WIFE_CODES     = new Set(['زال', 'zal', 'wife', 'w', 'spouse'])
const SON_CODES      = new Set(['ٻت', 'bt', 'beta', 'son', 'بيٽو', 'بيٽا', 'ٻيٽو', 'ٻيٽا'])
const DAUGHTER_CODES = new Set(['ڏي', 'di', 'beti', 'daughter', 'بيٽي', 'ڏيءَ'])
const MOTHER_CODES   = new Set(['ماءُ', 'ماء', 'maa', 'mother', 'mom', 'ماءَ'])
const FATHER_CODES   = new Set(['father', 'dad', 'abu', 'پيءُ', 'پيءَ', 'باپ', 'پيو', 'aabu'])

interface TreeNodeProps {
  member: TreeMember
  graphicMode: boolean
  isHead?: boolean
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
  isHead,
  isSelected,
  isDragOver,
  canEdit,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
}: TreeNodeProps) {
  const ageCategory = getAgeCategory(member.dob_year)
  const isFemale    = member.gender?.toLowerCase() === 'female'
  const t           = useTranslations('relation')

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

  // Translate relation label based on current locale
  function getRelationLabelI18n(m: TreeMember & { is_head?: boolean }): string {
    if (m.is_head || isHead) return t('head')
    const code = (m.relation_code ?? '').trim()
    const low  = code.toLowerCase()
    if (WIFE_CODES.has(low)     || WIFE_CODES.has(code))     return t('wife')
    if (SON_CODES.has(low)      || SON_CODES.has(code))      return t('son')
    if (DAUGHTER_CODES.has(low) || DAUGHTER_CODES.has(code)) return t('daughter')
    if (MOTHER_CODES.has(low)   || MOTHER_CODES.has(code))   return t('mother')
    if (FATHER_CODES.has(low)   || FATHER_CODES.has(code))   return t('father')
    return code || t('member')
  }

  const relationLabel = getRelationLabelI18n(isHead ? { ...member, is_head: true } : member)

  const nodeClasses = [
    'flex flex-col items-center gap-1 cursor-pointer select-none transition-all',
    isSelected ? 'scale-110' : 'hover:scale-105',
    isDragOver ? 'opacity-70' : '',
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
          : isFemale
            ? 'border-pink-300 bg-pink-50'
            : 'border-blue-300 bg-blue-50',
      ].join(' ')}>
        {graphicMode && member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <Symbol
            isFemale={isFemale}
            ageCategory={ageCategory}
            size={graphicMode ? 38 : 30}
          />
        )}

        {/* Gender dot */}
        <span className={[
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
          isFemale ? 'bg-pink-400' : 'bg-blue-400',
        ].join(' ')} />
      </div>

      {/* Name + Relation */}
      <div className="text-center max-w-[90px]">
        <div className="text-xs font-semibold text-gray-800 leading-tight truncate">
          {member.name}
        </div>
        <div className={[
          'text-[10px] font-medium mt-0.5',
          isFemale ? 'text-pink-500' : 'text-blue-500',
        ].join(' ')}>
          {relationLabel}
        </div>
        {member.dob_year && (
          <div className="text-[9px] text-gray-400 leading-tight">{member.dob_year}</div>
        )}
      </div>
    </div>
  )
}

// Clearly distinct male/female SVG symbols per age category
function Symbol({
  isFemale,
  ageCategory,
  size,
}: {
  isFemale: boolean
  ageCategory: 'child' | 'adult' | 'elder' | 'unknown'
  size: number
}) {
  const color = isFemale ? '#ec4899' : '#3b82f6'

  if (ageCategory === 'child') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="5.5" r="3" fill={color} />
        {isFemale ? (
          /* Girl — small dress */
          <path d="M10 9 L14 9 L16 19 L8 19 Z" fill={color} opacity="0.75" />
        ) : (
          /* Boy — shorts + legs */
          <>
            <rect x="9.5" y="9" width="5" height="4" rx="1" fill={color} opacity="0.85" />
            <rect x="9.5" y="13" width="2" height="6" rx="1" fill={color} opacity="0.85" />
            <rect x="12.5" y="13" width="2" height="6" rx="1" fill={color} opacity="0.85" />
          </>
        )}
        <line x1="9" y1="10.5" x2="7" y2="13" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="15" y1="10.5" x2="17" y2="13" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (ageCategory === 'elder') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="4.5" r="3" fill={color} />
        {isFemale ? (
          /* Elderly woman — dress + shawl */
          <path d="M9 8 L15 8 L17 19 L7 19 Z" fill={color} opacity="0.7" />
        ) : (
          /* Elderly man — pants + cane */
          <>
            <rect x="9.5" y="8" width="5" height="5" rx="1" fill={color} opacity="0.85" />
            <rect x="9.5" y="13" width="2" height="6" rx="1" fill={color} opacity="0.85" />
            <rect x="12.5" y="13" width="2" height="6" rx="1" fill={color} opacity="0.85" />
            {/* Cane */}
            <line x1="16" y1="12" x2="16" y2="19" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="14" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
        <line x1="9" y1="9.5" x2="6.5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="15" y1="9.5" x2="17.5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  // Adult
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="4.5" r="3.5" fill={color} />
      {isFemale ? (
        /* Woman — dress/skirt flare */
        <>
          <path d="M9.5 8.5 L14.5 8.5 L17 20 L7 20 Z" fill={color} opacity="0.75" />
          <line x1="9.5" y1="10" x2="6.5" y2="13.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="14.5" y1="10" x2="17.5" y2="13.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        /* Man — shirt + trousers */
        <>
          <rect x="9" y="8.5" width="6" height="5.5" rx="1" fill={color} opacity="0.85" />
          <rect x="9" y="14" width="2.5" height="6" rx="1" fill={color} opacity="0.85" />
          <rect x="12.5" y="14" width="2.5" height="6" rx="1" fill={color} opacity="0.85" />
          <line x1="9" y1="10" x2="6" y2="13.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="15" y1="10" x2="18" y2="13.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
