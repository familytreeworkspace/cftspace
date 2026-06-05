'use client'

import { useState, useTransition } from 'react'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { approveCorrection, rejectCorrection, holdCorrection } from '@/app/actions/corrections'

interface Correction {
  id: string
  table_name: string
  field_name: string
  old_value: string | null
  new_value: string
  status: string
  requested_by?: { name?: string } | null
  created_at: string
  updated_at: string
}

export default function CorrectionsClient({
  initialData,
  canReview,
}: {
  initialData: Correction[]
  canReview: boolean
}) {
  const [corrections, setCorrections] = useState(initialData)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialData.find(c => c.status === 'pending')?.id ?? initialData[0]?.id ?? null
  )
  const [isPending, startTransition] = useTransition()

  const selected = corrections.find(c => c.id === selectedId)
  const pendingCount = corrections.filter(c => c.status === 'pending').length

  const handleApprove = () => {
    if (!selected) return
    startTransition(async () => {
      await approveCorrection(selected.id)
      setCorrections(prev =>
        prev.map(c =>
          c.id === selected.id ? { ...c, status: 'approved' } : c
        )
      )
    })
  }

  const handleReject = () => {
    if (!selected) return
    startTransition(async () => {
      await rejectCorrection(selected.id, 'Rejected by admin')
      setCorrections(prev =>
        prev.map(c =>
          c.id === selected.id ? { ...c, status: 'rejected' } : c
        )
      )
    })
  }

  const handleHold = () => {
    if (!selected) return
    startTransition(async () => {
      await holdCorrection(selected.id)
      setCorrections(prev =>
        prev.map(c =>
          c.id === selected.id ? { ...c, status: 'hold' } : c
        )
      )
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left sidebar - corrections list */}
      <div className="lg:col-span-1">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Pending tab */}
          <div className="px-4 py-3 bg-muted/40 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">Pending ({pendingCount})</span>
            </div>
          </div>

          {/* Corrections list */}
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {corrections.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No corrections yet.
              </div>
            ) : (
              corrections
                .filter(c => c.status === 'pending')
                .map(correction => (
                  <button
                    key={correction.id}
                    onClick={() => setSelectedId(correction.id)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                      selectedId === correction.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="font-medium text-foreground text-sm">
                      {correction.requested_by?.name ?? 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {correction.field_name} · {new Date(correction.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Right panel - detail + actions */}
      <div className="lg:col-span-2 space-y-4">
        {selected ? (
          <>
            {/* Request detail */}
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Request detail</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Requested by
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-muted/40 text-foreground font-medium text-sm">
                    {selected.requested_by?.name ?? 'Unknown'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Field
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-muted/40 text-foreground font-medium text-sm capitalize">
                    {selected.field_name}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    From
                  </label>
                  <div className="px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/5 text-foreground text-sm">
                    {selected.old_value || '(empty)'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    To
                  </label>
                  <div className="px-4 py-3 rounded-lg border border-green-500/30 bg-green-500/5 text-foreground text-sm">
                    {selected.new_value}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {canReview && selected.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleReject}
                    disabled={isPending}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={handleHold}
                    disabled={isPending}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gold text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
                  >
                    ⏸ Hold
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isPending}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg heritage-gradient text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                </div>
              )}

              {selected.status !== 'pending' && (
                <div className="px-3 py-2 rounded-lg text-sm font-medium">
                  <span className={
                    selected.status === 'approved'
                      ? 'text-success'
                      : selected.status === 'rejected'
                      ? 'text-destructive'
                      : 'text-gold'
                  }>
                    {selected.status === 'approved' && '✓ Approved'}
                    {selected.status === 'rejected' && '✕ Rejected'}
                    {selected.status === 'hold' && '⏸ On Hold'}
                  </span>
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                📜 History
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  {selected.status === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                  ) : selected.status === 'rejected' ? (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-foreground">
                      <span className="font-medium">Submitted</span>{' '}
                      <span className="text-muted-foreground">correction request</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selected.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            No corrections to display
          </div>
        )}
      </div>
    </div>
  )
}
