'use client'

import { useState, useCallback } from 'react'
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

// Template file names (must match files in /public/templates/)
const TEMPLATE_FILES: Record<ImportType, string> = {
  household: 'household.csv',
  related:   'members.csv',
  sashan:    'sashan.csv',
  telephone: 'telephone.csv',
}

// ---- CSV Parser ----
function parseCSV(text: string): Record<string, string>[] {
  // Strip UTF-8 BOM if present (added by Excel when saving CSV UTF-8)
  const cleaned = text.replace(/^﻿/, '')
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  // Strip BOM from each header (Excel sometimes attaches BOM to column names)
  const headers = splitLine(lines[0]).map(h => h.replace(/^﻿/, '').trim())
  return lines.slice(1).map(line => {
    const values = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
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

  // ---- Step: Parse CSV File ----
  const handleFile = useCallback((file: File) => {
    setFileError(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Please upload a CSV file (.csv). Download the template above to see the correct format.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const rows = parseCSV(text)
        if (rows.length === 0) {
          setFileError('CSV file is empty or could not be read. Check that the file has a header row and at least one data row.')
          return
        }
        const headers = Object.keys(rows[0])
        const mapping = autoDetectMapping(headers)
        setState(s => ({
          ...s,
          rawHeaders: headers,
          rawRows: rows,
          columnMapping: mapping,
          step: 'map-columns',
        }))
      } catch {
        setFileError('Could not parse file. Make sure it is a valid CSV file.')
      }
    }
    reader.readAsText(file, 'UTF-8')
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
  function updateMapping(header: string, fieldKey: string) {
    setState(s => ({
      ...s,
      columnMapping: { ...s.columnMapping, [header]: fieldKey },
    }))
  }

  // ---- Step: Confirm Mapping → Preview ----
  function handleMappingConfirm() {
    setState(s => ({ ...s, step: 'preview' }))
  }

  // ---- Step: Run Import ----
  async function handleImport() {
    setState(s => ({ ...s, step: 'importing' }))

    // Apply column mapping
    const mappedRows = state.rawRows.map(row => {
      const mapped: Record<string, string> = {}
      for (const [header, fieldKey] of Object.entries(state.columnMapping)) {
        if (fieldKey) mapped[fieldKey] = row[header] ?? ''
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
  const ALL_STEPS = [
    { key: 'select-subcaste', label: 'Sub Caste' },
    { key: 'household',       label: 'Household' },
    { key: 'related',         label: 'Members'   },
    { key: 'sashan',          label: 'Relations' },
    { key: 'telephone',       label: 'Contacts'  },
  ]

  function getStepStatus(key: string) {
    if (key === 'select-subcaste') return state.subCasteId ? 'done' : 'active'
    if (state.completedTypes.includes(key as ImportType)) return 'done'
    if (key === state.importType && state.step !== 'select-subcaste') return 'active'
    return 'pending'
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Professional Step Indicator */}
      {state.step !== 'summary' && (
        <div className="mb-8 px-2">
          <div className="flex items-start">
            {ALL_STEPS.map((s, i) => {
              const status = getStepStatus(s.key)
              return (
                <div key={s.key} className="flex-1 flex flex-col items-center relative">
                  {/* Connecting line — left half */}
                  {i > 0 && (
                    <div className={`absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2 transition-colors ${
                      getStepStatus(ALL_STEPS[i - 1].key) === 'done' ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                  {/* Connecting line — right half */}
                  {i < ALL_STEPS.length - 1 && (
                    <div className={`absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2 transition-colors ${
                      status === 'done' ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                  {/* Circle */}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    status === 'done'   ? 'bg-primary border-primary text-primary-foreground' :
                    status === 'active' ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20' :
                                         'bg-background border-border text-muted-foreground'
                  }`}>
                    {status === 'done' ? '✓' : i + 1}
                  </div>
                  {/* Label */}
                  <span className={`mt-2 text-xs text-center font-medium leading-tight transition-colors ${
                    status === 'active' ? 'text-primary' :
                    status === 'done'   ? 'text-foreground' :
                                         'text-muted-foreground'
                  }`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
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
          onBack={() => setState(s => ({ ...s, step: 'upload', rawHeaders: [], rawRows: [], columnMapping: {} }))}
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
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Importing {IMPORT_TYPE_LABELS[state.importType]}...</p>
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
    <div className="space-y-6">
      {/* Template Downloads */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-1">CSV Templates</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Download these templates, fill them with your data, then import them one by one.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {IMPORT_SEQUENCE.map(type => (
            <a
              key={type}
              href={`/templates/${TEMPLATE_FILES[type]}`}
              download
              className="flex flex-col items-center gap-2 p-3 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center group"
            >
              <span className="text-2xl">📄</span>
              <span className="text-xs font-medium text-foreground group-hover:text-primary">
                {TEMPLATE_FILES[type]}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">{IMPORT_TYPE_LABELS[type]}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Sub Caste Selection */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Select Sub Caste</h2>
        <p className="text-sm text-muted-foreground mb-6">All imported data will be linked to this sub caste.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {subCastes.map(sc => (
            <button
              key={sc.id}
              onClick={() => onSelect(sc.id, sc.name)}
              className="border border-border rounded-lg p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <div className="font-medium text-foreground group-hover:text-primary">{sc.name}</div>
            </button>
          ))}
        </div>
        {subCastes.length === 0 && (
          <p className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            No sub castes found. Please create a sub caste first from Sub Caste Management.
          </p>
        )}
      </div>
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
  const templateFile = TEMPLATE_FILES[importType]

  return (
    <div className="bg-card rounded-xl border border-border p-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Upload — {IMPORT_TYPE_LABELS[importType]}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload the CSV file for this sheet. Column headers can be in Sindhi or English.
          </p>
        </div>
        <a
          href={`/templates/${templateFile}`}
          download
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap ml-4"
        >
          📥 {templateFile}
        </a>
      </div>

      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'
        }`}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="text-sm font-medium text-foreground">Drag & drop your CSV file here</p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse · only .csv files</p>
        <input type="file" accept=".csv" className="hidden" onChange={onFileInput} />
      </label>

      {fileError && (
        <div className="mt-3 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          {fileError}
        </div>
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
  const unmappedRequired = requiredFields.filter(r => !Object.values(mapping).includes(r))

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-1">Map Columns</h2>
      <p className="text-sm text-muted-foreground mb-1">
        {rowCount} rows detected. Match each CSV column to the correct field.
      </p>
      <p className="text-xs text-muted-foreground mb-5">
        Columns with Sindhi headers are auto-detected. Verify and adjust as needed.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border mb-5">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">CSV Column</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Maps To Field</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {headers.map(header => (
              <tr key={header}>
                <td className="px-4 py-2 font-medium text-foreground" dir="auto">
                  {header}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={mapping[header] ?? ''}
                    onChange={e => onUpdate(header, e.target.value)}
                    className="w-full text-sm rounded border border-border bg-background text-foreground px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— skip this column —</option>
                    {fields.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!mappedRequired && (
        <div className="mb-4 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">
          Required fields not mapped yet: <strong>{unmappedRequired.join(', ')}</strong>
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
          className="px-5 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Preview Data →
        </button>
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
    <div className="bg-card rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-1">Preview Data</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Showing first {rows.length} of {totalRows} rows. Confirm to import all {totalRows} records.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border mb-6">
        <table className="text-xs w-full">
          <thead className="bg-muted/40">
            <tr>
              {mappedHeaders.map(h => {
                const field = fields.find(f => f.key === mapping[h])
                return (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {field?.label ?? mapping[h]}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border even:bg-muted/20">
                {mappedHeaders.map(h => (
                  <td key={h} className="px-3 py-2 text-foreground max-w-[180px] truncate" dir="auto">
                    {row[h] || <span className="text-muted-foreground/50">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-accent"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          className="px-5 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90"
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
    <div className="bg-card rounded-xl border border-border p-8">
      {/* Result */}
      <div className={`rounded-lg p-4 mb-6 ${
        result.errors.length > 0
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
          : 'bg-success/10 border border-success/30'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{result.errors.length > 0 ? '⚠' : '✓'}</span>
          <span className="font-semibold text-foreground">
            {IMPORT_TYPE_LABELS[justCompleted]} — Import Complete
          </span>
        </div>
        <div className="text-sm text-foreground/80 space-y-1">
          <div>✓ {result.success} records imported successfully</div>
          {result.warnings.length > 0 && (
            <div className="text-yellow-600 dark:text-yellow-400">⚠ {result.warnings.length} warnings</div>
          )}
          {result.errors.length > 0 && (
            <div className="text-destructive">✗ {result.errors.length} errors</div>
          )}
        </div>
        {result.warnings.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer">Show warnings</summary>
            <ul className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 space-y-0.5 max-h-24 overflow-y-auto">
              {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </details>
        )}
        {result.errors.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer">Show errors</summary>
            <ul className="mt-1 text-xs text-destructive space-y-0.5 max-h-24 overflow-y-auto">
              {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </details>
        )}
      </div>

      {/* Next step prompt */}
      {nextType ? (
        <>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Import {IMPORT_TYPE_LABELS[nextType]} now?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            You can import now or skip and do it later.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onNext(true)}
              className="px-5 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90"
            >
              Yes, import {IMPORT_TYPE_LABELS[nextType]} →
            </button>
            <button
              onClick={() => onNext(false)}
              className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-accent"
            >
              Skip & Finish
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-foreground mb-4">All files imported!</h2>
          <button
            onClick={() => onNext(false)}
            className="px-5 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90"
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
    <div className="bg-card rounded-xl border border-border p-8">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="text-xl font-bold text-foreground">Import Complete</h2>
        <p className="text-muted-foreground mt-1">Sub Caste: {subCasteName}</p>
      </div>

      <div className="space-y-0 mb-8 divide-y divide-border">
        {IMPORT_SEQUENCE.map(type => {
          const r = results[type]
          if (!r) return (
            <div key={type} className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{IMPORT_TYPE_LABELS[type]}</span>
              <span className="text-xs text-muted-foreground/60">Skipped</span>
            </div>
          )
          return (
            <div key={type} className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-foreground">{IMPORT_TYPE_LABELS[type]}</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-success font-semibold">{r.success} imported</span>
                {r.warnings.length > 0 && <span className="text-yellow-500">{r.warnings.length} warnings</span>}
                {r.errors.length > 0 && <span className="text-destructive">{r.errors.length} errors</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-primary/10 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Total records imported</span>
        <span className="text-2xl font-bold text-primary">{totalSuccess}</span>
      </div>

      {totalWarnings > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-4 py-2 mb-6 text-sm text-yellow-700 dark:text-yellow-400">
          {totalWarnings} warnings total — review the data in Households to verify.
        </div>
      )}

      <div className="flex gap-3">
        <a
          href="/households"
          className="px-5 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90"
        >
          View Households →
        </a>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-accent"
        >
          Import Another Sub Caste
        </button>
      </div>
    </div>
  )
}
