'use client'

import { useState, useTransition } from 'react'
import { createVirtualAncestor } from '@/app/actions/tree'
import type { AncestorTrigger } from './MemberFlowNode'

interface Props {
  info: AncestorTrigger
  onCreated: () => void
  onCancel: () => void
}

export function AddAncestorModal({ info, onCreated, onCancel }: Props) {
  const [name, setName]       = useState(info.headFatherName ?? '')
  const [gender, setGender]   = useState('Male')
  const [dobYear, setDobYear] = useState('')
  const [error, setError]     = useState('')
  const [pending, start]      = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setError('')
    start(async () => {
      const result = await createVirtualAncestor({
        name: name.trim(),
        gender,
        dobYear: dobYear ? parseInt(dobYear) : null,
        subCasteId: info.subCasteId,
        childHouseholdId: info.householdId,
        relation: gender === 'Female' ? 'mother' : 'father',
      })
      if (result.error) { setError(result.error); return }
      onCreated()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px] max-w-full mx-4">
        <h3 className="font-semibold text-gray-800 text-base mb-1">Add Ancestor</h3>
        <p className="text-xs text-gray-500 mb-4">
          Adding ancestor above{' '}
          <span className="font-medium text-gray-700">{info.headName}</span>
          {' '}(Ghar #{info.gharNumber})
        </p>

        {info.headFatherName && (
          <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2">
            <span className="flex-shrink-0">✓</span>
            <span>Father name from import: <strong>"{info.headFatherName}"</strong> — pre-filled below</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ancestor's full name"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">Birth Year (optional)</label>
              <input
                type="number"
                value={dobYear}
                onChange={e => setDobYear(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                placeholder="e.g. 1920"
                min={1800}
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2.5 text-sm bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
            >
              {pending ? 'Adding...' : 'Add Ancestor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
