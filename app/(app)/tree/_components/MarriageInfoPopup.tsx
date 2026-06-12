'use client'

import { useEffect, useState } from 'react'
import { getMaidenInfo, getMarriedInfo, type MaidenInfo, type MarriedInfo } from '@/app/actions/marriage'

export type MarriageInfoTarget = {
  memberId: string
  memberName: string
  mode: 'maika' | 'sasural'
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

// Read-only popup: a WIFE's parents (maika) or a DAUGHTER's in-laws (sasural).
export default function MarriageInfoPopup({
  target, onClose,
}: {
  target: MarriageInfoTarget
  onClose: () => void
}) {
  const [loading, setLoading]   = useState(true)
  const [maiden, setMaiden]     = useState<MaidenInfo | null>(null)
  const [married, setMarried]   = useState<MarriedInfo | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (alive) setLoading(true)
      if (target.mode === 'maika') {
        const info = await getMaidenInfo(target.memberId)
        if (alive) setMaiden(info)
      } else {
        const info = await getMarriedInfo(target.memberId)
        if (alive) setMarried(info)
      }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [target])

  const isMaika = target.mode === 'maika'
  const title   = isMaika ? "Maiden Family (Maika)" : "Husband's Family (Sasural)"
  const accent  = isMaika ? 'text-blue-600' : 'text-pink-600'
  const ghar    = isMaika ? maiden?.gharNumber : married?.gharNumber

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] nodrag" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[380px] max-w-[92vw] mx-4 overflow-hidden"
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-[11px] uppercase tracking-wide text-gray-400">{title}</div>
          <div className={`text-base font-bold ${accent}`}>
            {isMaika ? '👪' : '💍'} {target.memberName}
          </div>
          {ghar && <div className="text-[11px] text-gray-400 mt-0.5">Ghar #{ghar}</div>}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2 min-h-[80px]">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isMaika ? (
            maiden ? (
              <>
                {maiden.external && (
                  <div className="text-[10px] text-amber-600 bg-amber-50 rounded-md px-2 py-1 mb-1 inline-block">
                    Outside community (manually entered)
                  </div>
                )}
                <Row label="Father"          value={maiden.fatherName} />
                <Row label="Father sub-caste" value={maiden.fatherSubCaste} />
                <Row label="Mother"          value={maiden.motherName} />
                <Row label="Mother sub-caste" value={maiden.motherSubCaste} />
                <Row label="Village / City"  value={maiden.village} />
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Maiden family not linked yet.</p>
            )
          ) : (
            married ? (
              <>
                <Row label="Husband"        value={married.husbandName} />
                <Row label="Husband father" value={married.husbandFatherName} />
                <Row label="Husband mother" value={married.husbandMotherName} />
                <Row label="Sub-caste"      value={married.subCaste} />
                <Row label="Current address" value={married.village} />
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Husband&apos;s family not linked yet.</p>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
