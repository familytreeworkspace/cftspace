'use client'

import { useState } from 'react'
import {
  Users, MapPin, BarChart3, Settings,
  Printer, Download, FileDown,
} from 'lucide-react'
import SubCasteReport from './reports/SubCasteReport'
import FamilyReport from './reports/FamilyReport'
import AgeReport from './reports/AgeReport'
import ProfessionReport from './reports/ProfessionReport'
import EducationReport from './reports/EducationReport'
import VillageReport from './reports/VillageReport'

interface SubCaste { id: string; name: string }
interface Village { id: string; name: string }

type ReportId = 'member' | 'village' | 'demographic' | 'custom'

const REPORT_TYPES: {
  id: ReportId
  label: string
  icon: React.ElementType
  description: string
}[] = [
  {
    id: 'member',
    label: 'Member directory',
    icon: Users,
    description: 'All members grouped by household',
  },
  {
    id: 'village',
    label: 'Village census',
    icon: MapPin,
    description: 'Population by village & sub caste',
  },
  {
    id: 'demographic',
    label: 'Demographics',
    icon: BarChart3,
    description: 'Age / gender distribution',
  },
  {
    id: 'custom',
    label: 'Custom report',
    icon: Settings,
    description: 'Build your own with filters',
  },
]

export default function ReportsClient({
  subCastes,
  villages,
}: {
  subCastes: SubCaste[]
  villages: Village[]
}) {
  const [activeReport, setActiveReport] = useState<ReportId>('member')
  const [filters, setFilters] = useState({
    subCaste: '',
    village: '',
    ageBand: '',
  })

  const handlePrint = () => window.print()
  const handleExcel = () => {
    // Export logic would go here
    alert('Excel export - coming soon')
  }
  const handlePDF = () => {
    // PDF export logic would go here
    alert('PDF export - coming soon')
  }

  return (
    <div className="space-y-6">
      {/* Report cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map(report => {
          const Icon = report.icon
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`rounded-xl border p-5 text-left transition-all ${
                activeReport === report.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/40'
              } surface-elevated`}
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{report.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
            </button>
          )
        })}
      </div>

      {/* Filters + Report preview */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filter Panel */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border surface-elevated p-5 h-fit print:hidden">
          <h3 className="font-semibold text-foreground mb-4">Filters</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Sub Caste
              </label>
              <select
                value={filters.subCaste}
                onChange={e => setFilters(f => ({ ...f, subCaste: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All</option>
                {subCastes.map(sc => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Village
              </label>
              <select
                value={filters.village}
                onChange={e => setFilters(f => ({ ...f, village: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All</option>
                {villages.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Age band
              </label>
              <select
                value={filters.ageBand}
                onChange={e => setFilters(f => ({ ...f, ageBand: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All ages</option>
                <option value="0-12">0-12 years</option>
                <option value="13-25">13-25 years</option>
                <option value="26-50">26-50 years</option>
                <option value="50+">50+ years</option>
              </select>
            </div>

            <button className="w-full px-4 py-2.5 text-sm font-medium rounded-lg heritage-gradient text-primary-foreground hover:opacity-90 transition-opacity">
              Apply filters
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border surface-elevated p-6">
          <div className="flex items-center justify-between mb-4 no-print">
            <h3 className="font-semibold text-foreground">
              Print preview: {REPORT_TYPES.find(r => r.id === activeReport)?.label}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={handleExcel}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
              <button
                onClick={handlePDF}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg heritage-gradient text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          {/* Report content */}
          <div className="overflow-x-auto">
            {activeReport === 'member' && <SubCasteReport subCastes={subCastes} />}
            {activeReport === 'village' && <VillageReport />}
            {activeReport === 'demographic' && <AgeReport subCastes={subCastes} />}
            {activeReport === 'custom' && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Custom report builder coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
