'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatValue, percentToGoal } from '@/lib/scorecard-utils'
import { Badge } from '@/components/ui/badge'

interface RollupRowProps {
  label: string
  level: 'company' | 'team'
  weekEndings: string[]
  /** Map of weekEnding -> total value for this rollup */
  weekTotals: Map<string, number>
  goalTotal: number | null
  dataType: string
  children?: React.ReactNode
  defaultExpanded?: boolean
}

export function RollupRow({
  label,
  level,
  weekEndings,
  weekTotals,
  goalTotal,
  dataType,
  children,
  defaultExpanded = false,
}: RollupRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  let grandTotal = 0
  weekEndings.forEach((week) => {
    grandTotal += weekTotals.get(week) || 0
  })

  const pctToGoal = goalTotal ? percentToGoal(grandTotal, goalTotal) : null

  return (
    <>
      <tr
        className={cn(
          'border-t cursor-pointer transition-colors',
          level === 'company' ? 'bg-primary/10 font-semibold' : 'bg-muted/40 font-medium'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Label with expand/collapse icon */}
        <td className="sticky left-0 z-10 px-3 py-2 text-left whitespace-nowrap"
          style={{ backgroundColor: 'inherit' }}
        >
          <div className="flex items-center gap-1.5">
            {expanded
              ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
            <span>{label}</span>
          </div>
        </td>

        {/* Goal total */}
        <td className="text-right px-3 py-2 text-muted-foreground">
          {goalTotal != null ? formatValue(goalTotal, dataType) : '-'}
        </td>

        {/* Weekly totals */}
        {weekEndings.map((week) => {
          const val = weekTotals.get(week) || 0
          return (
            <td key={week} className="text-right px-3 py-2">
              {val > 0 ? formatValue(val, dataType) : '-'}
            </td>
          )
        })}

        {/* Grand total */}
        <td className="text-right px-3 py-2">
          {grandTotal > 0 ? formatValue(grandTotal, dataType) : '-'}
        </td>

        {/* % to Goal */}
        <td className="text-right px-3 py-2">
          {pctToGoal != null ? (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                pctToGoal >= 0.9 ? 'bg-green-50 text-green-700 border-green-200' :
                pctToGoal >= 0.7 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-red-50 text-red-700 border-red-200'
              )}
            >
              {(pctToGoal * 100).toFixed(0)}%
            </Badge>
          ) : '-'}
        </td>
      </tr>

      {/* Expandable children */}
      {expanded && children}
    </>
  )
}

/** Helper to compute rollup totals from entries for a set of measure IDs */
export function computeRollupTotals(
  measureIds: string[],
  weekEndings: string[],
  entryMap: Map<string, any>
): Map<string, number> {
  const totals = new Map<string, number>()
  weekEndings.forEach((week) => {
    let sum = 0
    measureIds.forEach((mid) => {
      const entry = entryMap.get(`${mid}-${week}`)
      if (entry?.value != null) sum += Number(entry.value)
    })
    totals.set(week, sum)
  })
  return totals
}

/** Helper to sum goals for a set of measure IDs */
export function computeGoalTotal(
  measureIds: string[],
  goalMap: Map<string, number>
): number {
  let total = 0
  measureIds.forEach((mid) => {
    total += goalMap.get(mid) || 0
  })
  return total
}
