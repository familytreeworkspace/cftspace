'use client'

import { memo } from 'react'
import type { EdgeProps } from '@xyflow/react'

const LINE_COLOR  = '#1f2937'   // near-black
const LINE_WIDTH  = 2
const CORNER_R    = 10          // rounded corner radius

// ── Parent-child edge — orthogonal with rounded corners ───────
export const FamilyEdge = memo(function FamilyEdge({
  sourceX, sourceY, targetX, targetY,
}: EdgeProps) {
  const midY = sourceY + (targetY - sourceY) * 0.5
  const r = CORNER_R

  let d: string

  if (Math.abs(sourceX - targetX) < 2) {
    // Directly below — straight vertical line
    d = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
  } else if (targetX > sourceX) {
    // Child is to the RIGHT of parent
    d = [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${midY - r}`,
      `Q ${sourceX} ${midY} ${sourceX + r} ${midY}`,
      `L ${targetX - r} ${midY}`,
      `Q ${targetX} ${midY} ${targetX} ${midY + r}`,
      `L ${targetX} ${targetY}`,
    ].join(' ')
  } else {
    // Child is to the LEFT of parent
    d = [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${midY - r}`,
      `Q ${sourceX} ${midY} ${sourceX - r} ${midY}`,
      `L ${targetX + r} ${midY}`,
      `Q ${targetX} ${midY} ${targetX} ${midY + r}`,
      `L ${targetX} ${targetY}`,
    ].join(' ')
  }

  return (
    <path
      d={d}
      fill="none"
      stroke={LINE_COLOR}
      strokeWidth={LINE_WIDTH}
    />
  )
})

// ── Spouse edge — horizontal line right-to-left ───────────────
// sourceX = right side of husband card, targetX = left side of wife card
// Both at same Y (vertical center of cards)
export const SpouseEdge = memo(function SpouseEdge({
  sourceX, sourceY, targetX, targetY,
}: EdgeProps) {
  // Both handles are at mid-height of their respective cards (Position.Right / Position.Left)
  // so sourceY ≈ targetY — draw a flat horizontal line
  const y = (sourceY + targetY) / 2

  return (
    <line
      x1={sourceX}
      y1={y}
      x2={targetX}
      y2={y}
      stroke={LINE_COLOR}
      strokeWidth={LINE_WIDTH}
    />
  )
})
