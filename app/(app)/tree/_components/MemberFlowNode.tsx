'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import TreeNodeComponent from '../[id]/_components/TreeNode'
import type { TreeMember } from '@/lib/tree-utils'

export type AncestorTrigger = {
  householdId: string
  headName: string
  gharNumber: string
  headFatherName?: string | null
  subCasteId: string
}

export type MemberNodeData = {
  member: TreeMember
  graphicMode: boolean
  canEdit: boolean
  linkMode: boolean
  isHead: boolean
  gharNumber: string
  headFatherName?: string | null
  subCasteId: string
  onAddAncestor: (info: AncestorTrigger) => void
}

export const MemberFlowNode = memo(function MemberFlowNode({ data }: NodeProps) {
  const {
    member, graphicMode, canEdit, linkMode,
    isHead, gharNumber, headFatherName, subCasteId, onAddAncestor,
  } = data as MemberNodeData

  return (
    <div className="relative">
      {/* Always render handles so React Flow edges can attach; hide when not in link mode */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 12, height: 12, borderRadius: '50%', border: '2px solid white',
          background: linkMode ? '#3b82f6' : 'transparent',
          opacity: linkMode ? 1 : 0,
          pointerEvents: linkMode ? 'auto' : 'none',
        }}
      />

      {isHead && canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddAncestor({
              householdId: member.household_id,
              headName: member.name,
              gharNumber,
              headFatherName,
              subCasteId,
            })
          }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold hover:bg-emerald-600 z-20 shadow-md border-2 border-white transition-colors nodrag"
          title="Add ancestor above"
        >
          +
        </button>
      )}

      <TreeNodeComponent member={member} graphicMode={graphicMode} isHead={isHead} canEdit={false} />

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 12, height: 12, borderRadius: '50%', border: '2px solid white',
          background: linkMode ? '#3b82f6' : 'transparent',
          opacity: linkMode ? 1 : 0,
          pointerEvents: linkMode ? 'auto' : 'none',
        }}
      />
    </div>
  )
})
