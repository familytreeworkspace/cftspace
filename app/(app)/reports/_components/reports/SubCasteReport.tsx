'use client'

import { useState, useTransition } from 'react'
import { getSubCasteReport } from '@/app/actions/reports'
import ReportTable from '../ReportTable'
import { SUBCASTE_HEADERS } from '@/lib/excel-export'

interface SubCaste { id: string; name: string }

export default function SubCasteReport({ subCastes }: { subCastes: SubCaste[] }) {
  const [selectedId, setSelectedId] = useState('')
  const [rows, setRows]             = useState<Record<string, unknown>[]>([])
  const [isPending, start]          = useTransition()

  function handleSelect(id: string) {
    setSelectedId(id)
    if (!id) { setRows([]); return }
    start(async () => {
      const data = await getSubCasteReport(id)
      setRows(data as unknown as Record<string, unknown>[])
    })
  }

  const sc = subCastes.find(s => s.id === selectedId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Sub Caste</label>
        <select
          value={selectedId}
          onChange={e => handleSelect(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Select Sub Caste —</option>
          {subCastes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <ReportTable
        title="Sub Caste Wise Report"
        subtitle={sc ? `Sub Caste: ${sc.name}` : undefined}
        columns={[
          { key: 'ghar_number',      label: 'Ghar #',           className: 'font-mono text-blue-700 w-20' },
          { key: 'head_name',        label: 'Head Name',         className: 'font-medium' },
          { key: 'head_gender',      label: 'Gender',            className: 'w-20' },
          { key: 'dob_year',         label: 'Birth Year',        className: 'w-24' },
          { key: 'education',        label: 'Education' },
          { key: 'profession',       label: 'Profession' },
          { key: 'original_address', label: 'Original Address',  className: 'hidden lg:table-cell' },
          { key: 'current_address',  label: 'Current Address',   className: 'hidden lg:table-cell' },
          { key: 'member_count',     label: 'Members',           className: 'w-16 text-center' },
        ]}
        rows={rows}
        fileName={`subcaste-${sc?.name ?? 'report'}`}
        excelHeaders={SUBCASTE_HEADERS}
        loading={isPending}
        empty="Select a sub caste to generate the report."
      />
    </div>
  )
}
