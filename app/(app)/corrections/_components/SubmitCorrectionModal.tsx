'use client'

import { useState } from 'react'
import { submitCorrection } from '@/app/actions/corrections'

interface Props {
  tableName: string
  recordId: string
  fieldName: string
  fieldLabel: string
  currentValue: string
  onClose: () => void
}

export default function SubmitCorrectionModal({
  tableName,
  recordId,
  fieldName,
  fieldLabel,
  currentValue,
  onClose,
}: Props) {
  const [newValue, setNewValue] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newValue.trim()) { setError('New value is required.'); return }
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.set('table_name', tableName)
    fd.set('record_id',  recordId)
    fd.set('field_name', fieldName)
    fd.set('old_value',  currentValue)
    fd.set('new_value',  newValue.trim())

    const result = await submitCorrection(fd)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="font-semibold text-gray-800 mb-1">Correction Submitted</h3>
            <p className="text-sm text-gray-500 mb-5">
              Your correction request is pending review by an Admin.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Request Correction</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Field</label>
                <div className="text-sm font-medium text-gray-800">{fieldLabel}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Current Value</label>
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700 line-through">
                  {currentValue || <span className="italic text-red-300">empty</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Value <span className="text-red-500">*</span>
                </label>
                <input
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Enter the correct value..."
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:bg-blue-400"
                >
                  {loading ? 'Submitting...' : 'Submit Correction'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
