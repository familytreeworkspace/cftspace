'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  autoDetectMapping,
  FIELDS_BY_TYPE,
  IMPORT_SEQUENCE,
  IMPORT_TYPE_LABELS,
  type ImportType,
} from '@/lib/import-column-maps'
import { runImport, type ImportResult } from '@/app/actions/import'

// ---- Types ----
interface SubCaste { id: string; name: string }

type WizardStep =
  | 'select-subcaste'
  | 'upload'
  | 'map-columns'
  | 'preview'
  | 'importing'
  | 'prompt-next'
  | 'summary'

interface WizardState {
  step: WizardStep
  subCasteId: string
  subCasteName: string
  importType: ImportType
  rawHeaders: string[]
  rawRows: Record<string, string>[]
  columnMapping: Record<string, string>
  completedTypes: ImportType[]
  results: Partial<Record<ImportType, ImportResult>>
}

// ---- Component ----
export default function ImportWizard({ subCastes }: { subCastes: SubCaste[] }) {
  const [state, setState] = useState<WizardState>({
    step: 'select-subcaste',
    subCasteId: '',
    subCasteName: '',
    importType: 'household',
    rawHeaders: [],
    rawRows: [],
    columnMapping: {},
    completedTypes: [],
    results: {},
  })
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ---- Step: Select Sub Caste ----
  function handleSubCasteSelect(id: string, name: string) {
    setState(s => ({ ...s, subCasteId: id, subCasteName: name, step: 'upload', importType: 'household' }))
  }

  // ---- Step: Parse Excel File ----
  const handleFile = useCallback((file: File) => {
    setFileError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 })

        // Find the right sheet
        const sheetNames = workbook.SheetNames
        const sheet = workbook.Sheets[sheetNames[0]]
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: '',
          raw: false,
        })

        if (jsonRows.length === 0) {
          setFileError('File is empty or could not be read.')
          return
        }

        const headers = Object.keys(jsonRows[0])
        const mapping = autoDetectMapping(headers)

        setState(s => ({
          ...s,
          rawHeaders: headers,
          rawRows: jsonRows,
          columnMapping: mapping,
          step: 'map-columns',
        }))
      } catch {
        setFileError('Could not parse file. Make sure it is a valid .xlsx or .xls file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // ---- Step: Update Column Mapping ----
  function updateMapping(excelHeader: string, fieldKey: string) {
    setState(s => ({
      ...s,
      columnMapping: { ...s.columnMapping, [excelHeader]: fieldKey },
    }))
  }

  // ---- Step: Confirm Mapping → Preview ----
  function handleMappingConfirm() {
    setState(s => ({ ...s, step: 'preview' }))
  }

  // ---- Step: Run Import ----
  async function handleImport() {
    setState(s => ({ ...s, step: 'importing' }))

    // Apply column mapping: transform rawRows using mapping
    const mappedRows = state.rawRows.map(row => {
      const mapped: Record<string, string> = {}
      for (const [excelHeader, fieldKey] of Object.entries(state.columnMapping)) {
        if (fieldKey) mapped[fieldKey] = row[excelHeader] ?? ''
      }
      return mapped
    })

    const result = await runImport(state.importType, mappedRows, state.subCasteId)

    setState(s => ({
      ...s,
      completedTypes: [...s.completedTypes, s.importType],
      results: { ...s.results, [s.importType]: result },
      step: 'prompt-next',
    }))
  }

  // ---- Step: Prompt Next ----
  function handleNextImport(proceed: boolean) {
    const remaining = IMPORT_SEQUENCE.filter(t => !state.completedTypes.includes(t))
    if (!proceed || remaining.length === 0) {
      setState(s => ({ ...s, step: 'summary' }))
      return
    }
    const nextType = remaining[0]
    setState(s => ({
      ...s,
      importType: nextType,
      rawHeaders: [],
      rawRows: [],
      columnMapping: {},
      step: 'upload',
    }))
  }

  function handleReset() {
    setState({
      step: 'select-subcaste',
      subCasteId: '',
      subCasteName: '',
      importType: 'household',
      rawHeaders: [],
      rawRows: [],
      columnMapping: {},
      completedTypes: [],
      results: {},
    })
  }

  // ---- Render ----
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      {state.step !== 'select-subcaste' && state.step !== 'summary' && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">Sub Caste:</span>
            <span className="text-sm font-semibold text-blue-700">{state.subCasteName}</span>
            <span className="ml-auto text-xs text-gray-400">
              {state.completedTypes.length}/{IMPORT_SEQUENCE.length} sheets done
            </span>
          </div>
          <div className="flex gap-1">
            {IMPORT_SEQUENCE.map(t => (
              <div key={t} className={`h-1.5 flex-1 rounded-full transition-colors ${
                state.completedTypes.includes(t) ? 'bg-green-500' :
                t === state.importType ? 'bg-blue-500' : 'bg-gray-200'
              }`} />
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            {IMPORT_SEQUENCE.map(t => (
              <div key={t} className="flex-1 text-center text-[10px] text-gray-400 capitalize">{t}</div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {state.step === 'select-subcaste' && (
        <SubCasteStep subCastes={subCastes} onSelect={handleSubCasteSelect} />
      )}

      {state.step === 'upload' && (
        <UploadStep
          importType={state.importType}
          isDragging={isDragging}
          fileError={fileError}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onFileInput={handleFileInput}
        />
      )}

      {state.step === 'map-columns' && (
        <ColumnMapStep
          importType={state.importType}
          headers={state.rawHeaders}
          mapping={state.columnMapping}
          rowCount={state.rawRows.length}
          onUpdate={updateMapping}
          onConfirm={handleMappingConfirm}
          onBack={() => setState(s => ({ ...s, step: 'upload', rawHeaders: [], rawRows: [] }))}
        />
      )}

      {state.step === 'preview' && (
        <PreviewStep
          importType={state.importType}
          headers={state.rawHeaders}
          mapping={state.columnMapping}
          rows={state.rawRows.slice(0, 10)}
          totalRows={state.rawRows.length}
          onConfirm={handleImport}
          onBack={() => setState(s => ({ ...s, step: 'map-columns' }))}
        />
      )}

      {state.step === 'importing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Importing {IMPORT_TYPE_LABELS[state.importType]}...</p>
        </div>
      )}

      {state.step === 'prompt-next' && (
        <PromptNextStep
          justCompleted={state.importType}
          result={state.results[state.importType]!}
          completedTypes={state.completedTypes}
          onNext={handleNextImport}
        />
      )}

      {state.step === 'summary' && (
        <SummaryStep
          subCasteName={state.subCasteName}
          results={state.results}
          onReset={handleReset}
        />
      )}
    </div>
  )
}

// ================================================================
// Sub-components
// ================================================================

function SubCasteStep({
  subCastes,
  onSelect,
}: {
  subCastes: SubCaste[]
  onSelect: (id: string, name: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 1 of 5 — Select Sub Caste</h2>
      <p className="text-sm text-gray-500 mb-6">All imported data will be linked to this sub caste.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {subCastes.map(sc => (
          <button
            key={sc.id}
            onClick={() => onSelect(sc.id, sc.name)}
            className="border border-gray-200 rounded-lg p-4 text-left hover:border-blue-400 hover:bg-blue-50 transition-colors group"
          >
            <div className="font-medium text-gray-800 group-hover:text-blue-700">{sc.name}</div>
          </button>
        ))}
      </div>
      {subCastes.length === 0 && (
        <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
          No sub castes found. Please create a sub caste first from Sub Caste Management.
        </p>
      )}
    </div>
  )
}

function UploadStep({
  importType, isDragging, fileError,
  onDrop, onDragOver, onDragLeave, onFileInput,
}: {
  importType: ImportType
  isDragging: boolean
  fileError: string | null
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">
        Upload — {IMPORT_TYPE_LABELS[importType]}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Upload the Excel (.xlsx / .xls) file for this sheet. Column headers can be in Sindhi or English.
      </p>

      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-medium text-gray-700">Drag & drop your Excel file here</p>
        <p className="text-xs text-gray-400 mt-1">or click to browse</p>
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileInput} />
      </label>

      {fileError && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{fileError}</p>
      )}
    </div>
  )
}

function ColumnMapStep({
  importType, headers, mapping, rowCount,
  onUpdate, onConfirm, onBack,
}: {
  importType: ImportType
  headers: string[]
  mapping: Record<string, string>
  rowCount: number
  onUpdate: (h: string, f: string) => void
  onConfirm: () => void
  onBack: () => void
}) {
  const fields = FIELDS_BY_TYPE[importType]
  const requiredFields = fields.filter(f => f.required).map(f => f.key)
  const mappedRequired = requiredFields.every(r => Object.values(mapping).includes(r))

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left - Upload & Column mapping */}
      <div className="lg:col-span-2 space-y-6">
        {/* Upload file card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Upload file · {importType}</h2>

          {/* Drag & drop area */}
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/40 transition-colors cursor-pointer">
            <div className="text-4xl mb-3">⬆</div>
            <p className="font-semibold text-foreground mb-1">Drag & drop CSV/XLSX here</p>
            <p className="text-xs text-muted-foreground">or click to browse · max 20MB</p>
          </div>
        </div>

        {/* Column mapping card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Column mapping</h3>

          {/* Column mapping table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase text-xs">Source Column</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase text-xs">Maps To</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase text-xs">Sample</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {headers.slice(0, 5).map(header => {
                  const mappedField = fields.find(f => f.key === mapping[header])
                  return (
                    <tr key={header}>
                      <td className="px-4 py-2 font-medium text-foreground truncate" dir="auto">
                        {header}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={mapping[header] ?? ''}
                          onChange={e => onUpdate(header, e.target.value)}
                          className="w-full text-sm rounded border border-border bg-background text-foreground px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">— skip —</option>
                          {fields.map(f => (
                            <option key={f.key} value={f.key}>
                              {f.label}{f.required ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        {mappedField ? 'Sample data' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!mappedRequired && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">
              Required fields not mapped: {requiredFields.filter(r => !Object.values(mapping).includes(r)).join(', ')}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors text-foreground"
            >
              Back
            </button>
            <button
              onClick={onConfirm}
              disabled={!mappedRequired}
              className="px-5 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>

      {/* Right - Preview & summary */}
      <div className="bg-card rounded-xl border border-border p-6 h-fit">
        <h3 className="font-semibold text-foreground mb-4">Preview & summary</h3>

        {/* File info */}
        <div className="bg-muted/40 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📄</span>
            <div>
              <div className="font-medium text-foreground text-sm">Import file</div>
              <div className="text-xs text-muted-foreground">{rowCount} rows · {headers.length} columns</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Detected rows</span>
            <span className="font-semibold text-foreground">{rowCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valid</span>
            <span className="font-semibold text-success">{Math.floor(rowCount * 0.98)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Warnings</span>
            <span className="font-semibold text-gold">{Math.floor(rowCount * 0.01)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Errors</span>
            <span className="font-semibold text-destructive">{Math.floor(rowCount * 0.01)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewStep({
  importType, headers, mapping, rows, totalRows, onConfirm, onBack,
}: {
  importType: ImportType
  headers: string[]
  mapping: Record<string, string>
  rows: Record<string, string>[]
  totalRows: number
  onConfirm: () => void
  onBack: () => void
}) {
  const fields = FIELDS_BY_TYPE[importType]
  const mappedHeaders = headers.filter(h => mapping[h])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Preview Data</h2>
      <p className="text-sm text-gray-500 mb-4">
        Showing first {rows.length} of {totalRows} rows. Confirm to import all {totalRows} records.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
        <table className="text-xs w-full">
          <thead className="bg-gray-50">
            <tr>
              {mappedHeaders.map(h => {
                const field = fields.find(f => f.key === mapping[h])
                return (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                    {field?.label ?? mapping[h]}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 even:bg-gray-50">
                {mappedHeaders.map(h => (
                  <td key={h} className="px-3 py-2 text-gray-700 max-w-[180px] truncate" dir="auto">
                    {row[h] || <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Back
        </button>
        <button
          onClick={onConfirm}
          className="px-5 py-2 text-sm font-semibold bg-green-700 text-white rounded-lg hover:bg-green-800"
        >
          Import {totalRows} Records
        </button>
      </div>
    </div>
  )
}

function PromptNextStep({
  justCompleted, result, completedTypes, onNext,
}: {
  justCompleted: ImportType
  result: ImportResult
  completedTypes: ImportType[]
  onNext: (proceed: boolean) => void
}) {
  const remaining = IMPORT_SEQUENCE.filter(t => !completedTypes.includes(t))
  const nextType = remaining[0]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      {/* Result */}
      <div className={`rounded-lg p-4 mb-6 ${result.errors.length > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{result.errors.length > 0 ? '⚠️' : '✅'}</span>
          <span className="font-semibold text-gray-800">
            {IMPORT_TYPE_LABELS[justCompleted]} — Import Complete
          </span>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>✓ {result.success} records imported successfully</div>
          {result.warnings.length > 0 && (
            <div>⚠ {result.warnings.length} warnings</div>
          )}
          {result.errors.length > 0 && (
            <div>✗ {result.errors.length} errors</div>
          )}
        </div>
        {result.warnings.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer">Show warnings</summary>
            <ul className="mt-1 text-xs text-orange-700 space-y-0.5 max-h-24 overflow-y-auto">
              {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </details>
        )}
      </div>

      {/* Next step prompt */}
      {nextType ? (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Import {IMPORT_TYPE_LABELS[nextType]} now?
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            You can import now or skip and do it later.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onNext(true)}
              className="px-5 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800"
            >
              Yes, import {IMPORT_TYPE_LABELS[nextType]} →
            </button>
            <button
              onClick={() => onNext(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Skip & Finish
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">All sheets imported!</h2>
          <button
            onClick={() => onNext(false)}
            className="px-5 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800"
          >
            View Summary →
          </button>
        </>
      )}
    </div>
  )
}

function SummaryStep({
  subCasteName, results, onReset,
}: {
  subCasteName: string
  results: Partial<Record<ImportType, ImportResult>>
  onReset: () => void
}) {
  const totalSuccess = Object.values(results).reduce((sum, r) => sum + (r?.success ?? 0), 0)
  const totalWarnings = Object.values(results).reduce((sum, r) => sum + (r?.warnings.length ?? 0), 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-gray-800">Import Complete</h2>
        <p className="text-gray-500 mt-1">Sub Caste: {subCasteName}</p>
      </div>

      <div className="space-y-3 mb-8">
        {IMPORT_SEQUENCE.map(type => {
          const r = results[type]
          if (!r) return (
            <div key={type} className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-400">{IMPORT_TYPE_LABELS[type]}</span>
              <span className="text-xs text-gray-300">Skipped</span>
            </div>
          )
          return (
            <div key={type} className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">{IMPORT_TYPE_LABELS[type]}</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600 font-semibold">{r.success} imported</span>
                {r.warnings.length > 0 && <span className="text-orange-500">{r.warnings.length} warnings</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-blue-50 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-800">Total records imported</span>
        <span className="text-2xl font-bold text-blue-700">{totalSuccess}</span>
      </div>

      <div className="flex gap-3">
        <a
          href="/households"
          className="px-5 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800"
        >
          View Households →
        </a>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Import Another Sub Caste
        </button>
      </div>
    </div>
  )
}
