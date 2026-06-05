'use client'

import { useState, useTransition } from 'react'
import { getVillageReport, getVillageMarriedReport } from '@/app/actions/reports'
import ReportTable from '../ReportTable'
import { VILLAGE_HEADERS, MARRIED_VILLAGE_HEADERS } from '@/lib/excel-export'

type VillageTab = 'all' | 'married'

export default function VillageReport() {
  const [tab, setTab]           = useState<VillageTab>('all')
  const [village, setVillage]   = useState('')
  const [rows, setRows]         = useState<Record<string, unknown>[]>([])
  const [isPending, start]      = useTransition()

  function handleRun() {
    if (!village.trim()) return
    start(async () => {
      const data = tab === 'all'
        ? await getVillageReport(village)
        : await getVillageMarriedReport(village)
      setRows(data as unknown as Record<string, unknown>[])
    })
  }

  const isMarried = tab === 'married'

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {([
          { id: 'all',     label: 'Village Wise' },
          { id: 'married', label: 'Village Married Households' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setRows([]) }}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.id ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg border border-gray-200 p-4">
        <input
          value={village}
          onChange={e => setVillage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRun()}
          placeholder="Enter village / area name..."
          className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleRun}
          disabled={isPending || !village.trim()}
          className="px-4 py-1.5 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:bg-blue-400"
        >
          {isPending ? 'Loading...' : 'Generate'}
        </button>
      </div>

      {isMarried ? (
        <ReportTable
          title="Village Wise — Married Households"
          subtitle={village ? `Village: "${village}"` : undefined}
          columns={[
            { key: 'ghar_number',      label: 'Ghar #',    className: 'font-mono text-blue-700 w-20' },
            { key: 'head_name',        label: 'Head Name', className: 'font-medium' },
            { key: 'wife_name',        label: 'Wife Name' },
            { key: 'original_address', label: 'Address' },
            { key: 'sub_caste_name',   label: 'Sub Caste' },
          ]}
          rows={rows}
          fileName={`village-married-${village}`}
          excelHeaders={MARRIED_VILLAGE_HEADERS}
          loading={isPending}
          empty="Enter a village name and click Generate."
        />
      ) : (
        <ReportTable
          title="Village Wise Report"
          subtitle={village ? `Village / Area: "${village}"` : undefined}
          columns={[
            { key: 'ghar_number',      label: 'Ghar #',          className: 'font-mono text-blue-700 w-20' },
            { key: 'head_name',        label: 'Head Name',        className: 'font-medium' },
            { key: 'sub_caste_name',   label: 'Sub Caste' },
            { key: 'original_address', label: 'Original Address', className: 'hidden lg:table-cell' },
            { key: 'current_address',  label: 'Current Address',  className: 'hidden lg:table-cell' },
            { key: 'member_count',     label: 'Members',          className: 'w-16 text-center' },
          ]}
          rows={rows}
          fileName={`village-${village}`}
          excelHeaders={VILLAGE_HEADERS}
          loading={isPending}
          empty="Enter a village name and click Generate."
        />
      )}
    </div>
  )
}
