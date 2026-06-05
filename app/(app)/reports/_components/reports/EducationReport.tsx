'use client'

import { useState, useTransition } from 'react'
import { getEducationReport } from '@/app/actions/reports'
import ReportTable from '../ReportTable'
import { EDUCATION_HEADERS } from '@/lib/excel-export'

interface SubCaste { id: string; name: string }

const EDUCATION_LEVELS = ['Matric', 'Intermediate', 'Graduate', 'Post Graduate', 'Illiterate', 'Primary', 'Middle']

export default function EducationReport({ subCastes }: { subCastes: SubCaste[] }) {
  const [education, setEducation]   = useState('')
  const [subCasteId, setSubCasteId] = useState('')
  const [rows, setRows]             = useState<Record<string, unknown>[]>([])
  const [isPending, start]          = useTransition()

  function handleRun() {
    if (!education.trim()) return
    start(async () => {
      const data = await getEducationReport(education, subCasteId || undefined)
      setRows(data as unknown as Record<string, unknown>[])
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <input
            value={education}
            onChange={e => setEducation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRun()}
            placeholder="Enter education level..."
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <div className="flex gap-1 flex-wrap">
            {EDUCATION_LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setEducation(l)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  education === l ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-100 text-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
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
          disabled={isPending || !education.trim()}
          className="px-4 py-1.5 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:bg-blue-400"
        >
          {isPending ? 'Loading...' : 'Generate'}
        </button>
      </div>

      <ReportTable
        title="Education Wise Report"
        subtitle={education ? `Education: "${education}"` : undefined}
        columns={[
          { key: 'ghar_number',    label: 'Ghar #',    className: 'font-mono text-blue-700 w-20' },
          { key: 'name',           label: 'Name',      className: 'font-medium' },
          { key: 'gender',         label: 'Gender',    className: 'w-20' },
          { key: 'relation_code',  label: 'Relation' },
          { key: 'education',      label: 'Education' },
          { key: 'dob_year',       label: 'Birth Year', className: 'w-24' },
          { key: 'sub_caste_name', label: 'Sub Caste',  className: 'hidden md:table-cell' },
        ]}
        rows={rows}
        fileName={`education-${education}`}
        excelHeaders={EDUCATION_HEADERS}
        loading={isPending}
        empty="Enter an education level and click Generate."
      />
    </div>
  )
}
