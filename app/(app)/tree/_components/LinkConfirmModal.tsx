'use client'

import { useState } from 'react'

interface Props {
  sourceId: string
  targetId: string
  sourceName: string
  targetName: string
  onConfirm: (relation: 'father' | 'mother' | 'spouse', sourceIsParent: boolean) => void
  onCancel: () => void
}

export function LinkConfirmModal({ sourceName, targetName, onConfirm, onCancel }: Props) {
  const [relation, setRelation] = useState<'father' | 'mother' | 'spouse'>('father')
  const [sourceIsParent, setSourceIsParent] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[340px] max-w-full mx-4">
        <h3 className="font-semibold text-gray-800 text-base mb-1">Create Family Link</h3>
        <p className="text-xs text-gray-500 mb-4">Define the relationship between these two members</p>

        <div className="flex items-center gap-2 text-sm mb-4 p-2.5 bg-gray-50 rounded-lg">
          <span className="font-medium text-blue-700 truncate">{sourceName}</span>
          <span className="text-gray-400 flex-shrink-0">↔</span>
          <span className="font-medium text-blue-700 truncate">{targetName}</span>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Relation Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['father', 'mother', 'spouse'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRelation(r)}
                  className={[
                    'py-2 text-xs rounded-lg border font-medium transition-colors capitalize',
                    relation === r
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {relation !== 'spouse' && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Who is the parent?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSourceIsParent(false)}
                  className={[
                    'flex-1 py-2 text-xs rounded-lg border font-medium transition-colors',
                    !sourceIsParent
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {targetName} ← parent
                </button>
                <button
                  onClick={() => setSourceIsParent(true)}
                  className={[
                    'flex-1 py-2 text-xs rounded-lg border font-medium transition-colors',
                    sourceIsParent
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {sourceName} ← parent
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(relation, sourceIsParent)}
            className="flex-1 py-2.5 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
          >
            Link
          </button>
        </div>
      </div>
    </div>
  )
}
