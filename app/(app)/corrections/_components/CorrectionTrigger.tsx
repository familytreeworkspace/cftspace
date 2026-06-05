'use client'

import { useState } from 'react'
import SubmitCorrectionModal from './SubmitCorrectionModal'

interface Props {
  tableName: string
  recordId: string
  fieldName: string
  fieldLabel: string
  currentValue: string
  children: React.ReactNode
}

export default function CorrectionTrigger({
  tableName,
  recordId,
  fieldName,
  fieldLabel,
  currentValue,
  children,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="group relative inline-flex items-center gap-1">
        {children}
        <button
          onClick={() => setOpen(true)}
          title="Request correction"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-orange-500 ml-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {open && (
        <SubmitCorrectionModal
          tableName={tableName}
          recordId={recordId}
          fieldName={fieldName}
          fieldLabel={fieldLabel}
          currentValue={currentValue}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
