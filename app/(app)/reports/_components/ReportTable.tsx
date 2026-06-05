'use client'

import { exportToExcel } from '@/lib/excel-export'

interface Column {
  key: string
  label: string
  className?: string
}

interface ReportTableProps {
  title: string
  subtitle?: string
  columns: Column[]
  rows: Record<string, unknown>[]
  fileName: string
  excelHeaders?: { key: string; label: string }[]
  loading?: boolean
  empty?: string
}

export default function ReportTable({
  title,
  subtitle,
  columns,
  rows,
  fileName,
  excelHeaders,
  loading,
  empty = 'No data found. Adjust your filters.',
}: ReportTableProps) {
  function handlePrint() {
    window.print()
  }

  function handleExcel() {
    exportToExcel(rows, excelHeaders ?? columns, fileName)
  }

  return (
    <div>
      {/* Action bar — hidden on print */}
      <div className="flex items-center justify-between mb-3 print:hidden">
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{rows.length} records</span>
          {rows.length > 0 && (
            <>
              <button
                onClick={handleExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Print header — only on print */}
      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        <p className="text-xs text-gray-400 mt-1">
          Generated: {new Date().toLocaleDateString()} · {rows.length} records
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
          {empty}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 print:border-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 print:bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 w-8">#</th>
                {columns.map(col => (
                  <th key={col.key} className={`text-left px-3 py-2.5 text-xs font-semibold text-gray-500 ${col.className ?? ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 even:bg-gray-50/50 print:even:bg-gray-50">
                  <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                  {columns.map(col => (
                    <td key={col.key} className={`px-3 py-2.5 text-gray-700 ${col.className ?? ''}`}>
                      {row[col.key] !== null && row[col.key] !== undefined
                        ? String(row[col.key])
                        : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
