'use client'

import { useState, useTransition } from 'react'
import { getProfessionReport } from '@/app/actions/reports'
import ReportTable from '../ReportTable'
import { PROFESSION_HEADERS } from '@/lib/excel-export'

interface SubCaste { id: string; name: string }

export default function ProfessionReport({ subCastes }: { subCastes: SubCaste[] }) {
  const [profession, setProfession] = useState('')
  const [subCasteId, setSubCasteId] = useState('')
  const [rows, setRows]             = useState<Record<string, unknown>[]>([])
  const [isPending, start]          = useTransition()

  function handleRun() {
    if (!profession.trim()) return
    start(async () => {
      const data = await getProfessionReport(profession, subCasteId || undefined)
      setRows(data as unknown as Record<string, unknown>[])
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg border border-gray-200 p-4">
        <input
          value={profession}
          onChange={e => setProfession(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRun()}
          placeholder="Enter profession (e.g. Farmer, Business...)"
          className="flex-1 min-w-[180px] px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
          disabled={isPending || !profession.trim()}
          className="px-4 py-1.5 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:bg-blue-400"
        >
          {isPending ? 'Loading...' : 'Generate'}
        </button>
      </div>

      <ReportTable
        title="Profession Wise Report"
        subtitle={profession ? `Profession: "${profession}"` : undefined}
        columns={[
          { key: 'ghar_number',    label: 'Ghar #',    className: 'font-mono text-blue-700 w-20' },
          { key: 'name',           label: 'Name',      className: 'font-medium' },
          { key: 'gender',         label: 'Gender',    className: 'w-20' },
          { key: 'relation_code',  label: 'Relation' },
          { key: 'profession',     label: 'Profession' },
          { key: 'dob_year',       label: 'Birth Year', className: 'w-24' },
          { key: 'sub_caste_name', label: 'Sub Caste',  className: 'hidden md:table-cell' },
        ]}
        rows={rows}
        fileName={`profession-${profession}`}
        excelHeaders={PROFESSION_HEADERS}
        loading={isPending}
        empty="Enter a profession keyword and click Generate."
      />
    </div>
  )
}
