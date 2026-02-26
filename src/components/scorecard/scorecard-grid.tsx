'use client'

import { useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { formatValue, formatWeekHeader, percentToGoal } from '@/lib/scorecard-utils'
import { Badge } from '@/components/ui/badge'
import { RollupRow, computeRollupTotals, computeGoalTotal } from './rollup-row'
import { CellEntryPopover } from './cell-entry-popover'
import { useGroupMembers } from '@/hooks/use-group-members'

interface ScorecardGridProps {
  template: any
  entries: any[]
  goals: any[]
  weekEndings: string[]
  groupId: string
  quarter?: string
  readOnly?: boolean
  onCellClick?: (entryId: string | null, measureId: string, weekEnding: string) => void
  onCreateIssue?: (measureName: string, value: number | null, goal: number | null) => void
  onGoalEdit?: (goalId: string | null, measureId: string, measureName: string, dataType: string, currentValue: number | null) => void
}

export function ScorecardGrid({
  template,
  entries,
  goals,
  weekEndings,
  groupId,
  quarter,
  readOnly = false,
  onCellClick,
  onCreateIssue,
  onGoalEdit,
}: ScorecardGridProps) {
  const { data: members } = useGroupMembers(groupId)

  // Build per-user entry map (for popover individual values)
  const userEntryMap = useMemo(() => {
    const map = new Map<string, any>()
    entries?.forEach((e: any) => {
      map.set(`${e.measure_id}-${e.week_ending}-${e.user_id}`, e)
    })
    return map
  }, [entries])

  // Build aggregate map (for grid cell display - sum per measure+week)
  // Also compute calculated measure values from their formulas
  const aggregateMap = useMemo(() => {
    const map = new Map<string, number>()
    entries?.forEach((e: any) => {
      const key = `${e.measure_id}-${e.week_ending}`
      map.set(key, (map.get(key) || 0) + Number(e.value || 0))
    })

    // Compute calculated measures (e.g., sum of source measures)
    template?.scorecard_sections?.forEach((section: any) => {
      // Build name->id lookup within this section
      const nameToId = new Map<string, string>()
      section.scorecard_measures?.forEach((m: any) => {
        nameToId.set(m.name, m.id)
      })

      section.scorecard_measures?.forEach((m: any) => {
        if (!m.is_calculated || !m.calculation_formula) return
        const formula = m.calculation_formula
        if (formula.type === 'sum' && Array.isArray(formula.source_measures)) {
          weekEndings.forEach((week) => {
            let sum = 0
            formula.source_measures.forEach((sourceName: string) => {
              const sourceId = nameToId.get(sourceName)
              if (sourceId) {
                sum += map.get(`${sourceId}-${week}`) || 0
              }
            })
            map.set(`${m.id}-${week}`, sum)
          })
        } else if (formula.type === 'ratio' && formula.numerator && formula.denominator) {
          weekEndings.forEach((week) => {
            const numId = nameToId.get(formula.numerator)
            const denId = nameToId.get(formula.denominator)
            const numerator = numId ? (map.get(`${numId}-${week}`) || 0) : 0
            const denominator = denId ? (map.get(`${denId}-${week}`) || 0) : 0
            const ratio = denominator > 0 ? numerator / denominator : 0
            map.set(`${m.id}-${week}`, ratio)
          })
        }
      })
    })

    return map
  }, [entries, template, weekEndings])

  // Build compatibility map for rollup calculations (key -> {value: number})
  const rollupEntryMap = useMemo(() => {
    const map = new Map<string, any>()
    aggregateMap.forEach((value, key) => {
      map.set(key, { value })
    })
    return map
  }, [aggregateMap])

  const goalMap = useMemo(() => {
    const map = new Map<string, number>()
    goals?.forEach((g: any) => map.set(g.measure_id, g.goal_value))
    return map
  }, [goals])

  const goalIdMap = useMemo(() => {
    const map = new Map<string, string>()
    goals?.forEach((g: any) => map.set(g.measure_id, g.id))
    return map
  }, [goals])

  // Build a lookup of measure id -> measure object for formula access
  const measureById = useMemo(() => {
    const map = new Map<string, any>()
    template?.scorecard_sections?.forEach((s: any) => {
      s.scorecard_measures?.forEach((m: any) => {
        map.set(m.id, m)
      })
    })
    return map
  }, [template])

  // Build name->id lookup per section for ratio total computation
  const sectionNameToId = useMemo(() => {
    const map = new Map<string, Map<string, string>>()
    template?.scorecard_sections?.forEach((s: any) => {
      const nameMap = new Map<string, string>()
      s.scorecard_measures?.forEach((m: any) => {
        nameMap.set(m.name, m.id)
      })
      s.scorecard_measures?.forEach((m: any) => {
        map.set(m.id, nameMap)
      })
    })
    return map
  }, [template])

  // Calculate total for a measure across visible weeks (from aggregateMap)
  // For ratio measures, compute total as overall numerator / overall denominator
  const getMeasureTotal = useCallback((measureId: string) => {
    const measure = measureById.get(measureId)
    const formula = measure?.calculation_formula
    if (formula?.type === 'ratio' && formula.numerator && formula.denominator) {
      const nameMap = sectionNameToId.get(measureId)
      const numId = nameMap?.get(formula.numerator)
      const denId = nameMap?.get(formula.denominator)
      if (numId && denId) {
        let totalNum = 0, totalDen = 0
        weekEndings.forEach((week) => {
          totalNum += aggregateMap.get(`${numId}-${week}`) || 0
          totalDen += aggregateMap.get(`${denId}-${week}`) || 0
        })
        return totalDen > 0 ? totalNum / totalDen : 0
      }
    }
    let total = 0
    weekEndings.forEach((week) => {
      total += aggregateMap.get(`${measureId}-${week}`) || 0
    })
    return total
  }, [weekEndings, aggregateMap, measureById, sectionNameToId])

  if (!template?.scorecard_sections) return null

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 text-left px-3 py-2 font-medium min-w-[240px]">
              Measure
            </th>
            <th className="text-right px-3 py-2 font-medium min-w-[80px]">Goal</th>
            {weekEndings.map((week) => (
              <th key={week} className="text-right px-3 py-2 font-medium min-w-[90px]">
                {formatWeekHeader(week)}
              </th>
            ))}
            <th className="text-right px-3 py-2 font-medium min-w-[80px]">Total</th>
            <th className="text-right px-3 py-2 font-medium min-w-[80px]">% to Goal</th>
          </tr>
        </thead>
        <tbody>
          {template.scorecard_sections.map((section: any) => (
            <ScorecardSection
              key={section.id}
              section={section}
              weekEndings={weekEndings}
              rollupEntryMap={rollupEntryMap}
              aggregateMap={aggregateMap}
              userEntryMap={userEntryMap}
              goalMap={goalMap}
              goalIdMap={goalIdMap}
              members={members || []}
              groupId={groupId}
              readOnly={readOnly}
              getMeasureTotal={getMeasureTotal}
              onDetailClick={onCellClick}
              onCreateIssue={onCreateIssue}
              onGoalEdit={onGoalEdit}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ScorecardSectionProps {
  section: any
  weekEndings: string[]
  rollupEntryMap: Map<string, any>
  aggregateMap: Map<string, number>
  userEntryMap: Map<string, any>
  goalMap: Map<string, number>
  goalIdMap: Map<string, string>
  members: any[]
  groupId: string
  readOnly: boolean
  getMeasureTotal: (measureId: string) => number
  onDetailClick?: (entryId: string | null, measureId: string, weekEnding: string) => void
  onCreateIssue?: (measureName: string, value: number | null, goal: number | null) => void
  onGoalEdit?: (goalId: string | null, measureId: string, measureName: string, dataType: string, currentValue: number | null) => void
}

function ScorecardSection({
  section,
  weekEndings,
  rollupEntryMap,
  aggregateMap,
  userEntryMap,
  goalMap,
  goalIdMap,
  members,
  groupId,
  readOnly,
  getMeasureTotal,
  onDetailClick,
  onCreateIssue,
  onGoalEdit,
}: ScorecardSectionProps) {
  const measures = section.scorecard_measures || []

  // Compute team-level rollup for this section (exclude calculated and percentage measures)
  const sectionMeasureIds = measures.filter((m: any) => !m.is_calculated && m.data_type !== 'percentage').map((m: any) => m.id)
  const sectionWeekTotals = computeRollupTotals(sectionMeasureIds, weekEndings, rollupEntryMap)
  const sectionGoalTotal = computeGoalTotal(sectionMeasureIds, goalMap)

  // Determine dominant data type for rollup display
  // If all non-calculated measures share a type, use it; otherwise show plain numbers
  const nonCalcMeasures = measures.filter((m: any) => !m.is_calculated)
  const dataTypes = new Set(nonCalcMeasures.map((m: any) => m.data_type))
  const sectionDataType = dataTypes.size === 1 ? nonCalcMeasures[0]?.data_type || 'count' : 'count'

  return (
    <>
      <RollupRow
        label={section.name}
        level="team"
        weekEndings={weekEndings}
        weekTotals={sectionWeekTotals}
        goalTotal={sectionGoalTotal}
        dataType={sectionDataType}
        defaultExpanded={true}
      >
        {measures.map((measure: any) => {
          const goal = goalMap.get(measure.id)
          const total = getMeasureTotal(measure.id)
          const pctToGoal = goal ? percentToGoal(total, goal) : null

          return (
            <tr key={measure.id} className="border-t hover:bg-muted/30 transition-colors">
              {/* Measure name */}
              <td className="sticky left-0 z-10 bg-background px-3 py-1.5 text-left whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className={cn(measure.is_calculated && 'font-medium italic')}>
                    {measure.name}
                  </span>
                  {measure.owner?.full_name && (
                    <span className="text-xs text-muted-foreground">({measure.owner.full_name})</span>
                  )}
                </div>
              </td>

              {/* Goal (clickable for editing) */}
              <td
                className={cn(
                  'text-right px-3 py-1.5 text-muted-foreground',
                  onGoalEdit && 'cursor-pointer hover:text-primary hover:underline'
                )}
                onClick={() => onGoalEdit && onGoalEdit(
                  goalIdMap.get(measure.id) || null,
                  measure.id,
                  measure.name,
                  measure.data_type,
                  goal ?? null,
                )}
              >
                {goal != null ? formatValue(goal, measure.data_type) : '-'}
              </td>

              {/* Weekly cells with popover entry */}
              {weekEndings.map((week) => {
                const aggValue = aggregateMap.get(`${measure.id}-${week}`) || 0

                if (measure.is_calculated) {
                  return (
                    <td key={week} className="text-right px-3 py-1.5 font-medium bg-muted/20">
                      {aggValue > 0 ? formatValue(aggValue, measure.data_type) : '-'}
                    </td>
                  )
                }

                return (
                  <td key={week} className="text-right px-3 py-1.5 relative">
                    <CellEntryPopover
                      measureId={measure.id}
                      measureName={measure.name}
                      dataType={measure.data_type}
                      weekEnding={week}
                      groupId={groupId}
                      weekEndings={weekEndings}
                      members={members}
                      userEntryMap={userEntryMap}
                      aggregateValue={aggValue}
                      readOnly={readOnly}
                    >
                      <button
                        className={cn(
                          'w-full text-right cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5',
                          aggValue === 0 && 'text-muted-foreground'
                        )}
                      >
                        {formatValue(aggValue, measure.data_type)}
                      </button>
                    </CellEntryPopover>
                  </td>
                )
              })}

              {/* Total */}
              <td className="text-right px-3 py-1.5 font-medium">
                {total > 0 ? formatValue(total, measure.data_type) : '-'}
              </td>

              {/* % to Goal */}
              <td className="text-right px-3 py-1.5">
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
          )
        })}
      </RollupRow>
    </>
  )
}
