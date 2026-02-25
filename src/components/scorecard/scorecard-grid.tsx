'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { cn } from '@/lib/utils'
import { formatValue, parseInputValue, formatWeekHeader, percentToGoal } from '@/lib/scorecard-utils'
import { Badge } from '@/components/ui/badge'
import { RollupRow, computeRollupTotals, computeGoalTotal } from './rollup-row'
import { mutate } from 'swr'

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

interface EditingCell {
  measureId: string
  weekEnding: string
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
  const { user } = useUser()
  const supabase = createClient()
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // Build lookup maps for fast access
  const entryMap = new Map<string, any>()
  entries?.forEach((e: any) => {
    entryMap.set(`${e.measure_id}-${e.week_ending}`, e)
  })

  const goalMap = new Map<string, number>()
  const goalIdMap = new Map<string, string>()
  goals?.forEach((g: any) => {
    goalMap.set(g.measure_id, g.goal_value)
    goalIdMap.set(g.measure_id, g.id)
  })

  // Check if current user owns a measure (can edit)
  const canEdit = useCallback((measure: any) => {
    if (readOnly) return false
    if (!user) return false
    // If measure has a specific owner, only that owner can edit
    if (measure.owner_user_id) return measure.owner_user_id === user.id
    // Otherwise any group member can edit their own entries
    return true
  }, [user, readOnly])

  // Check if a cell has detail line items
  const hasDetails = useCallback((measureId: string, weekEnding: string) => {
    const entry = entryMap.get(`${measureId}-${weekEnding}`)
    return entry?.id ? true : false // Will be enhanced when details are loaded
  }, [entryMap])

  // Calculate total for a measure across visible weeks
  const getMeasureTotal = useCallback((measureId: string) => {
    let total = 0
    weekEndings.forEach((week) => {
      const entry = entryMap.get(`${measureId}-${week}`)
      if (entry?.value != null) total += Number(entry.value)
    })
    return total
  }, [weekEndings, entryMap])

  // Calculate section total for a week (sum all measures in section)
  const getSectionWeekTotal = useCallback((section: any, weekEnding: string) => {
    let total = 0
    section.scorecard_measures?.forEach((m: any) => {
      if (m.is_calculated) return
      const entry = entryMap.get(`${m.id}-${weekEnding}`)
      if (entry?.value != null) total += Number(entry.value)
    })
    return total
  }, [entryMap])

  // Save entry
  const saveEntry = useCallback(async (measureId: string, weekEnding: string, rawValue: string, dataType: string) => {
    if (!user) return
    const value = parseInputValue(rawValue, dataType)
    const existing = entryMap.get(`${measureId}-${weekEnding}`)

    if (existing) {
      if (value === null && existing.value === null) return
      if (value === existing.value) return
      await supabase
        .from('scorecard_entries')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else if (value !== null) {
      await supabase
        .from('scorecard_entries')
        .insert({ measure_id: measureId, user_id: user.id, week_ending: weekEnding, value })
    }

    mutate(`scorecard-entries-${groupId}-${weekEndings.join(',')}`)
  }, [user, supabase, groupId, weekEndings, entryMap])

  // Handle cell click to start editing
  const handleCellClick = useCallback((measure: any, weekEnding: string) => {
    if (!canEdit(measure) || measure.is_calculated) return
    const entry = entryMap.get(`${measure.id}-${weekEnding}`)
    setEditingCell({ measureId: measure.id, weekEnding })
    setEditValue(entry?.value != null ? String(entry.value) : '')
  }, [canEdit, entryMap])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, measure: any, weekIdx: number, section: any) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      saveEntry(measure.id, weekEndings[weekIdx], editValue, measure.data_type)
      setEditingCell(null)

      // Navigate to next cell
      const measures = section.scorecard_measures?.filter((m: any) => !m.is_calculated) || []
      const currentMeasureIdx = measures.findIndex((m: any) => m.id === measure.id)

      if (e.key === 'Tab' && !e.shiftKey) {
        // Move right (next week) or down to next measure
        if (weekIdx < weekEndings.length - 1) {
          handleCellClick(measure, weekEndings[weekIdx + 1])
        } else if (currentMeasureIdx < measures.length - 1) {
          handleCellClick(measures[currentMeasureIdx + 1], weekEndings[0])
        }
      } else if (e.key === 'Enter') {
        // Move down to next measure
        if (currentMeasureIdx < measures.length - 1) {
          handleCellClick(measures[currentMeasureIdx + 1], weekEndings[weekIdx])
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }, [editValue, weekEndings, saveEntry, handleCellClick])

  // Handle blur (save and close)
  const handleBlur = useCallback((measureId: string, weekEnding: string, dataType: string) => {
    saveEntry(measureId, weekEnding, editValue, dataType)
    setEditingCell(null)
  }, [editValue, saveEntry])

  // Compute company-level rollup across all sections
  const companyRollup = useMemo(() => {
    const allMeasureIds: string[] = []
    template?.scorecard_sections?.forEach((s: any) => {
      s.scorecard_measures?.forEach((m: any) => {
        if (!m.is_calculated) allMeasureIds.push(m.id)
      })
    })
    return {
      weekTotals: computeRollupTotals(allMeasureIds, weekEndings, entryMap),
      goalTotal: computeGoalTotal(allMeasureIds, goalMap),
    }
  }, [template, weekEndings, entryMap, goalMap])

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
          {/* Company-level rollup (expandable, contains all sections) */}
          <RollupRow
            label="Company Total"
            level="company"
            weekEndings={weekEndings}
            weekTotals={companyRollup.weekTotals}
            goalTotal={companyRollup.goalTotal}
            dataType="currency"
            defaultExpanded={true}
          >
            {template.scorecard_sections.map((section: any) => (
              <ScorecardSection
                key={section.id}
                section={section}
                weekEndings={weekEndings}
                entryMap={entryMap}
                goalMap={goalMap}
                goalIdMap={goalIdMap}
                editingCell={editingCell}
                editValue={editValue}
                inputRef={inputRef}
                canEdit={canEdit}
                getMeasureTotal={getMeasureTotal}
                onCellClick={handleCellClick}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onEditValueChange={setEditValue}
                onDetailClick={onCellClick}
                onCreateIssue={onCreateIssue}
                onGoalEdit={onGoalEdit}
              />
            ))}
          </RollupRow>
        </tbody>
      </table>
    </div>
  )
}

interface ScorecardSectionProps {
  section: any
  weekEndings: string[]
  entryMap: Map<string, any>
  goalMap: Map<string, number>
  goalIdMap: Map<string, string>
  editingCell: EditingCell | null
  editValue: string
  inputRef: React.RefObject<HTMLInputElement | null>
  canEdit: (measure: any) => boolean
  getMeasureTotal: (measureId: string) => number
  onCellClick: (measure: any, weekEnding: string) => void
  onKeyDown: (e: React.KeyboardEvent, measure: any, weekIdx: number, section: any) => void
  onBlur: (measureId: string, weekEnding: string, dataType: string) => void
  onEditValueChange: (value: string) => void
  onDetailClick?: (entryId: string | null, measureId: string, weekEnding: string) => void
  onCreateIssue?: (measureName: string, value: number | null, goal: number | null) => void
  onGoalEdit?: (goalId: string | null, measureId: string, measureName: string, dataType: string, currentValue: number | null) => void
}

function ScorecardSection({
  section,
  weekEndings,
  entryMap,
  goalMap,
  goalIdMap,
  editingCell,
  editValue,
  inputRef,
  canEdit,
  getMeasureTotal,
  onCellClick,
  onKeyDown,
  onBlur,
  onEditValueChange,
  onDetailClick,
  onCreateIssue,
  onGoalEdit,
}: ScorecardSectionProps) {
  const measures = section.scorecard_measures || []

  // Compute team-level rollup for this section
  const sectionMeasureIds = measures.filter((m: any) => !m.is_calculated).map((m: any) => m.id)
  const sectionWeekTotals = computeRollupTotals(sectionMeasureIds, weekEndings, entryMap)
  const sectionGoalTotal = computeGoalTotal(sectionMeasureIds, goalMap)

  return (
    <>
      {/* Team-level rollup row (expandable, defaults expanded) */}
      <RollupRow
        label={section.name}
        level="team"
        weekEndings={weekEndings}
        weekTotals={sectionWeekTotals}
        goalTotal={sectionGoalTotal}
        dataType="currency"
        defaultExpanded={true}
      >

      {/* Measure rows */}
      {measures.map((measure: any) => {
        const goal = goalMap.get(measure.id)
        const total = getMeasureTotal(measure.id)
        const pctToGoal = goal ? percentToGoal(total, goal) : null
        const editable = canEdit(measure) && !measure.is_calculated

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

            {/* Weekly cells */}
            {weekEndings.map((week, weekIdx) => {
              const entry = entryMap.get(`${measure.id}-${week}`)
              const isEditing = editingCell?.measureId === measure.id && editingCell?.weekEnding === week
              const value = entry?.value

              if (measure.is_calculated) {
                return (
                  <td key={week} className="text-right px-3 py-1.5 font-medium bg-muted/20">
                    {value != null ? formatValue(value, measure.data_type) : '-'}
                  </td>
                )
              }

              return (
                <td
                  key={week}
                  className={cn(
                    'text-right px-3 py-1.5 relative',
                    editable && 'cursor-pointer hover:bg-primary/5',
                    !editable && 'text-muted-foreground'
                  )}
                  onClick={() => editable && onCellClick(measure, week)}
                >
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => onEditValueChange(e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, measure, weekIdx, section)}
                      onBlur={() => onBlur(measure.id, week, measure.data_type)}
                      className="w-full text-right bg-background border rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      {entry?.id && onDetailClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDetailClick(entry.id, measure.id, week)
                          }}
                          className="w-0 h-0 border-l-[5px] border-l-transparent border-t-[5px] border-t-blue-500 shrink-0"
                          title="View details"
                        />
                      )}
                      <span>{value != null ? formatValue(value, measure.data_type) : ''}</span>
                    </div>
                  )}
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
