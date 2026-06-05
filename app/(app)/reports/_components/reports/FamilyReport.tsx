'use client'

import { useState, useTransition } from 'react'
import { getFamilyReport } from '@/app/actions/reports'
import { exportToExcel } from '@/lib/excel-export'

interface Household { id: string; ghar_number: string; head_name: string }

export default function FamilyReport({ households }: { households: Household[] }) {
  const [selectedId, setSelectedId] = useState('')
  const [data, setData]             = useState<Awaited<ReturnType<typeof getFamilyReport>> | null>(null)
  const [isPending, start]          = useTransition()

  function handleSelect(id: string) {
    setSelectedId(id)
    if (!id) { setData(null); return }
    start(async () => {
      const result = await getFamilyReport(id)
      setData(result)
    })
  }

  function handleExcel() {
    if (!data) return
    const rows = data.members.map(m => ({
      member_number: m.member_number,
      name: m.name,
      gender: m.gender,
      relation_code: m.relation_code,
      dob_year: m.dob_year,
      education: m.education,
      profession: m.profession,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sub_caste: (m.sub_castes as any)?.name ?? '',
    }))
    exportToExcel(rows as Record<string, unknown>[], [
      { key: 'member_number', label: '#' },
      { key: 'name',          label: 'Name' },
      { key: 'gender',        label: 'Gender' },
      { key: 'relation_code', label: 'Relation' },
      { key: 'dob_year',      label: 'Birth Year' },
      { key: 'education',     label: 'Education' },
      { key: 'profession',    label: 'Profession' },
      { key: 'sub_caste',     label: 'Sub Caste' },
    ], `family-${data.household?.ghar_number ?? 'report'}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scName = (data?.household?.sub_castes as any)?.name ?? '—'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Household</label>
        <select
          value={selectedId}
          onChange={e => handleSelect(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
        >
          <option value="">— Select Household —</option>
          {households.map(h => (
            <option key={h.id} value={h.id}>Ghar #{h.ghar_number} — {h.head_name}</option>
          ))}
        </select>
      </div>

      {isPending && (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isPending && data && (
        <div className="space-y-4">
          {/* Household Info */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 print:bg-white print:border-gray-300">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-lg">
                Ghar #{data.household?.ghar_number} — {data.household?.head_name}
              </h3>
              <button
                onClick={handleExcel}
                className="print:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-white text-gray-700"
              >
                Excel
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500 text-xs">Sub Caste</span><br />{scName}</div>
              <div><span className="text-gray-500 text-xs">Gender</span><br />{data.household?.head_gender}</div>
              <div><span className="text-gray-500 text-xs">Birth Year</span><br />{data.household?.dob_year ?? '—'}</div>
              <div><span className="text-gray-500 text-xs">Profession</span><br />{data.household?.profession ?? '—'}</div>
              <div className="col-span-2"><span className="text-gray-500 text-xs">Original Address</span><br />{data.household?.original_address ?? '—'}</div>
              <div className="col-span-2"><span className="text-gray-500 text-xs">Current Address</span><br />{data.household?.current_address ?? '—'}</div>
            </div>
            {data.contacts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <span className="text-xs text-gray-500">Contacts: </span>
                {data.contacts.map((c, i) => (
                  <span key={i} className="text-sm font-mono ml-2">{c.contact_number}</span>
                ))}
              </div>
            )}
          </div>

          {/* Members Table */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">
              Members ({data.members.length})
            </h4>
            {data.members.length === 0 ? (
              <p className="text-sm text-gray-400">No members recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-8">#</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Name</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Relation</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Gender</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Birth Year</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 hidden md:table-cell">Education</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 hidden md:table-cell">Profession</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.members.map((m, i) => (
                      <tr key={m.id} className="border-t border-gray-100 even:bg-gray-50/50">
                        <td className="px-3 py-2 text-gray-400 text-xs">{m.member_number ?? i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{m.name}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded" dir="rtl">{m.relation_code}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{m.gender}</td>
                        <td className="px-3 py-2 text-gray-500">{m.dob_year ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500 hidden md:table-cell">{m.education ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500 hidden md:table-cell">{m.profession ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800"
          >
            Print / PDF
          </button>
        </div>
      )}

      {!isPending && !data && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
          Select a household to generate the family report.
        </div>
      )}
    </div>
  )
}
