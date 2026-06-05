'use client'

import { useState, useTransition } from 'react'
import { getAgeReport } from '@/app/actions/reports'
import ReportTable from '../ReportTable'
import { PERSON_HEADERS } from '@/lib/excel-export'

interface SubCaste { id: string; name: string }

export default function AgeReport({ subCastes }: { subCastes: SubCaste[] }) {
  const [minAge, setMinAge]         = useState('')
  const [maxAge, setMaxAge]         = useState('')
  const [subCasteId, setSubCasteId] = useState('')
  const [rows, setRows]             = useState<Record<string, unknown>[]>([])
  const [isPending, start]          = useTransition()

  function handleRun() {
    start(async () => {
      const data = await getAgeReport(
        minAge ? Number(minAge) : null,
        maxAge ? Number(maxAge) : null,
        subCasteId || undefined
      )
      setRows(data as unknown as Record<string, unknown>[])
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Age from</label>
          <input
            type="number" min="0" max="120" value={minAge}
            onChange={e => setMinAge(e.target.value)}
            placeholder="0"
            className="w-20 px-2 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">to</label>
          <input
            type="number" min="0" max="120" value={maxAge}
            onChange={e => setMaxAge(e.target.value)}
            placeholder="120"
            className="w-20 px-2 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={subCasteId}
          onChange={e => setSubCasteId(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sub Castes</option>
          {subCastes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button
          onClick={handleRun}
          disabled={isPending}
          className="px-4 py-1.5 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:bg-blue-400"
        >
          {isPending ? 'Loading...' : 'Generate'}
        </button>
      </div>

      <ReportTable
        title="Age Wise Report"
        subtitle={`${minAge || '0'}–${maxAge || '∞'} years`}
        columns={[
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { key: 'ghar_number' as any, label: 'Ghar #', className: 'font-mono text-blue-700 w-20' },
          { key: 'name',           label: 'Name',       className: 'font-medium' },
          { key: 'gender',         label: 'Gender',     className: 'w-20' },
          { key: 'relation_code',  label: 'Relation' },
          { key: 'dob_year',       label: 'Birth Year', className: 'w-24' },
          { key: 'age',            label: 'Age',        className: 'w-16 font-semibold text-blue-700' },
          { key: 'sub_caste_name', label: 'Sub Caste',  className: 'hidden md:table-cell' },
        ]}
        rows={rows.map(r => ({ ...r, ghar_number: (r.households as Record<string, unknown>)?.ghar_number ?? '—' }))}
        fileName="age-report"
        excelHeaders={PERSON_HEADERS}
        loading={isPending}
        empty="Set age range and click Generate."
      />
    </div>
  )
}
