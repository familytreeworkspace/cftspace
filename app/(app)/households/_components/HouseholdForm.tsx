'use client'

import { useState, useTransition } from 'react'
import { createHousehold, updateHousehold } from '@/app/actions/households'
import { getTransliteration } from '@/app/actions/transliteration'

interface SubCaste { id: string; name: string }

interface HouseholdData {
  id?: string
  sub_caste_id?: string | null
  ghar_number?: string
  head_name?: string
  head_name_sindhi?: string | null
  head_name_hindi?: string | null
  head_gender?: 'Male' | 'Female'
  dob_year?: number | null
  education?: string | null
  profession?: string | null
  original_address?: string | null
  current_address?: string | null
}

export default function HouseholdForm({
  subCastes,
  defaultSubCasteId,
  household,
}: {
  subCastes: SubCaste[]
  defaultSubCasteId?: string
  household?: HouseholdData
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!household?.id

  // Sindhi/Hindi transliteration state
  const [sindhiName, setSindhiName] = useState(household?.head_name_sindhi || '')
  const [hindiName, setHindiName] = useState(household?.head_name_hindi || '')
  const [confidence, setConfidence] = useState(0)
  const [headNameValue, setHeadNameValue] = useState(household?.head_name || '')

  async function handleGetSuggestion() {
    if (!headNameValue.trim()) {
      setError('Please enter head name first')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await getTransliteration(headNameValue, 'Sindhi name transliteration')
      if (result.error) {
        setError(result.error)
      } else {
        setSindhiName(result.sindhi)
        setHindiName(result.hindi)
        setConfidence(result.confidence)
      }
    })
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    // Add Sindhi/Hindi values to form
    if (sindhiName) formData.append('head_name_sindhi', sindhiName)
    if (hindiName) formData.append('head_name_hindi', hindiName)

    const result = isEdit
      ? await updateHousehold(household!.id!, formData)
      : await createHousehold(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Section 1: Basic Info */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sub Caste */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Sub Caste <span className="text-destructive">*</span>
            </label>
            <select
              name="sub_caste_id"
              required
              defaultValue={household?.sub_caste_id ?? defaultSubCasteId ?? ''}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Select Sub Caste —</option>
              {subCastes.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>

          {/* Ghar Number */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Ghar Number <span className="text-destructive">*</span>
            </label>
            <input
              name="ghar_number"
              required
              defaultValue={household?.ghar_number ?? ''}
              placeholder="e.g. 001"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Head Details */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Head of Household</h2>

        {/* Head Name - English + AI Suggestion */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Name (English) <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="head_name"
              required
              value={headNameValue}
              onChange={e => setHeadNameValue(e.target.value)}
              placeholder="Full name in English"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleGetSuggestion}
              disabled={isPending}
              className="px-3 py-2 text-sm font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              🤖 {isPending ? 'Getting...' : 'Suggest'}
            </button>
          </div>
        </div>

        {/* Sindhi Name - AI Suggestion Result */}
        {(sindhiName || confidence > 0) && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Name (Sindhi) سنڌي
              </label>
              <span className="text-xs font-semibold text-primary">
                Confidence: {confidence}%
              </span>
            </div>
            <input
              type="text"
              value={sindhiName}
              onChange={e => setSindhiName(e.target.value)}
              placeholder="Sindhi transliteration"
              dir="rtl"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              AI suggestion - edit if needed
            </p>
          </div>
        )}

        {/* Hindi Name - AI Suggestion Result */}
        {(hindiName || confidence > 0) && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Name (Hindi) हिंदी
            </label>
            <input
              type="text"
              value={hindiName}
              onChange={e => setHindiName(e.target.value)}
              placeholder="Hindi transliteration"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Gender</label>
            <select
              name="head_gender"
              defaultValue={household?.head_gender ?? 'Male'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Male">Male</option>
              <option value="Female">Female (Widow / Divorce)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Birth Year</label>
            <input
              name="dob_year"
              type="number"
              min="1900"
              max="2025"
              defaultValue={household?.dob_year ?? ''}
              placeholder="e.g. 1965"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Education & Profession */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Education (تعليم)
            </label>
            <input
              name="education"
              defaultValue={household?.education ?? ''}
              placeholder="e.g. Matric, Graduate"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Profession (ڪاروبار)
            </label>
            <input
              name="profession"
              defaultValue={household?.profession ?? ''}
              placeholder="e.g. Farmer, Business"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Addresses */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Addresses</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Original Address (اصل پتو)
            </label>
            <input
              name="original_address"
              defaultValue={household?.original_address ?? ''}
              placeholder="Village / Area of origin"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Current Address (موجوده پتو)
            </label>
            <input
              name="current_address"
              defaultValue={household?.current_address ?? ''}
              placeholder="Current residence"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Household'}
        </button>
        <a
          href={isEdit ? `/households/${household!.id}` : '/households'}
          className="px-4 py-2.5 text-sm font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
