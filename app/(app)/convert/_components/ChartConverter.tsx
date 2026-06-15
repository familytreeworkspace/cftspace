'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, Users } from 'lucide-react'
import { parseChart, type ConvertResult } from '../_lib/parseChart'

const MEMBER_HEADERS = ['ghar_number', 'member_number', 'name', 'gender', 'relation',
  'father_name', 'father_subcaste', 'father_address', 'raw_annotation', 'review'] as const
const HOUSEHOLD_HEADERS = ['ghar_number', 'head_name', 'head_gender', 'sub_caste', 'address', 'review'] as const
const BETI_HEADERS = ['beti_name', 'beti_father_ghar', 'name', 'gender', 'relation', 'parent_name',
  'assoc_father_name', 'assoc_father_subcaste', 'assoc_father_address', 'raw_annotation'] as const

export default function ChartConverter() {
  const [fileName, setFileName]   = useState('')
  const [subCaste, setSubCaste]   = useState('')
  const [result, setResult]       = useState<ConvertResult | null>(null)
  const [error, setError]         = useState('')
  const [busy, setBusy]           = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    setResult(null)
    setBusy(true)
    try {
      const base = file.name.replace(/\.[^.]+$/, '')
      setFileName(file.name)
      // Always adopt the just-uploaded file's name — never reuse the previous file's
      // sub-caste, otherwise a new file would download with the OLD file's name (overwrite risk).
      const sc = base
      setSubCaste(sc)

      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type: 'array' })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const rows = (XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][])
        .map(row => row.map(c => String(c == null ? '' : c).trim()))

      const res = parseChart(rows, sc)
      setResult(res)
    } catch (e) {
      setError('Could not read this file. Make sure it is a valid .xls / .xlsx chart.')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  function download(kind: 'household' | 'member' | 'beti') {
    if (!result) return
    const map = {
      household: { rows: result.households, headers: HOUSEHOLD_HEADERS, sheet: 'household', file: 'household.xlsx' },
      member:    { rows: result.members,    headers: MEMBER_HEADERS,    sheet: 'member',    file: 'member.xlsx' },
      beti:      { rows: result.betiData,   headers: BETI_HEADERS,      sheet: 'beti_data', file: 'beti_data.xlsx' },
    }[kind]
    const ws = XLSX.utils.json_to_sheet(map.rows, { header: map.headers as unknown as string[] })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, map.sheet)
    XLSX.writeFile(wb, `${subCaste || 'chart'}_${map.file}`)
  }

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sub Caste name (output)</label>
            <input
              value={subCaste}
              onChange={e => setSubCaste(e.target.value)}
              placeholder="e.g. Makwana"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {busy ? 'Reading…' : 'Upload chart (.xls)'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
        {fileName && (
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> {fileName}
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      {result && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Households" value={result.stats.households} />
            <Stat label="Members"    value={result.stats.members} />
            <Stat label="beti_data"  value={result.stats.betiData} />
            <Stat label="Roots"      value={result.stats.roots.length} hint={result.stats.roots.join(', ')} />
          </div>

          {/* Download */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" /> Download import files
            </h3>
            <div className="flex flex-wrap gap-2">
              <DownloadBtn label={`household.xlsx (${result.households.length})`} onClick={() => download('household')} />
              <DownloadBtn label={`member.xlsx (${result.members.length})`}       onClick={() => download('member')} />
              <DownloadBtn label={`beti_data.xlsx (${result.betiData.length})`}    onClick={() => download('beti')} muted={result.betiData.length === 0} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Review the preview below, then feed household.xlsx & member.xlsx into the Import Wizard.
            </p>
          </div>

          {/* Flags */}
          {(result.flags.length > 0 || result.members.some(m => m.review)) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Needs a quick review
              </h3>
              <ul className="text-xs text-amber-800/90 space-y-1 list-disc pl-5">
                {result.flags.map((f, i) => <li key={i}>{f}</li>)}
                {result.members.filter(m => m.review === 'CHECK-SPLIT').slice(0, 30).map((m, i) => (
                  <li key={'s' + i}>
                    CHECK-SPLIT — ghar {m.ghar_number} #{m.member_number} ({m.relation}): raw “{m.raw_annotation}”
                    → {m.father_name} / {m.father_subcaste} / {m.father_address}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" /> Preview — first 8 households
            </h3>
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {result.households.slice(0, 8).map(h => (
                <div key={h.ghar_number} className="rounded-lg border border-border/70 overflow-hidden">
                  <div className="bg-muted/60 px-3 py-1.5 text-sm font-medium flex items-center gap-2">
                    <span className="text-primary">Ghar {h.ghar_number}</span>
                    <span>{h.head_name}</span>
                    <span className="text-xs text-muted-foreground">({h.head_gender})</span>
                    {h.address && <span className="text-[10px] text-muted-foreground">· {h.address}</span>}
                    {h.review && <span className="ml-auto text-[10px] text-amber-600">⚠ {h.review}</span>}
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {result.members.filter(m => m.ghar_number === h.ghar_number).map((m, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-3 py-1 text-muted-foreground w-8">#{m.member_number}</td>
                          <td className="px-2 py-1 font-medium">{m.name}</td>
                          <td className="px-2 py-1 text-muted-foreground w-20">{m.relation}</td>
                          <td className="px-2 py-1 text-muted-foreground">
                            {[m.father_name, m.father_subcaste, m.father_address].filter(Boolean).join(' / ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Parsed {result.stats.names} names · root: {result.stats.roots.join(', ') || '—'}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4" title={hint}>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function DownloadBtn({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={muted}
      className={[
        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
        muted
          ? 'border-border text-muted-foreground opacity-50 cursor-not-allowed'
          : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10',
      ].join(' ')}
    >
      <Download className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
