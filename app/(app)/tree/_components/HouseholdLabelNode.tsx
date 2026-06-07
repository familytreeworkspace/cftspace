'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'

export type HouseholdLabelData = {
  gharNumber: string
  headName: string
  memberCount: number
  isVirtual?: boolean
}

export const HouseholdLabelNode = memo(function HouseholdLabelNode({ data }: NodeProps) {
  const { gharNumber, headName, memberCount, isVirtual } = data as HouseholdLabelData

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold select-none w-full">
      <span>{isVirtual ? '👤' : '🏠'}</span>
      <span className={isVirtual ? 'text-amber-800' : 'text-blue-800'}>
        Ghar #{gharNumber}
      </span>
      <span className="font-normal opacity-60 truncate">— {headName}</span>
      <span className={[
        'ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0',
        isVirtual ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600',
      ].join(' ')}>
        {memberCount}
      </span>
    </div>
  )
})
