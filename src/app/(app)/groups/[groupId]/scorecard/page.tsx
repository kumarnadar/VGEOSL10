'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import {
  useScorecardTemplate,
  useScorecardEntries,
  useScorecardGoals,
  useScorecardSettings,
} from '@/hooks/use-scorecard'
import { ScorecardGrid } from '@/components/scorecard/scorecard-grid'
import { ScorecardTimeHeader } from '@/components/scorecard/scorecard-time-header'
import { DetailLineItemsPanel } from '@/components/scorecard/detail-line-items-panel'
import { GoalEditor } from '@/components/scorecard/goal-editor'
import { TableSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCurrentQuarterLabel } from '@/lib/scorecard-utils'
import Link from 'next/link'

export default function ScorecardPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const { user } = useUser()

  // Time controls
  const [weekEndings, setWeekEndings] = useState<string[]>([])
  const quarterLabel = getCurrentQuarterLabel()

  // Data hooks
  const { data: settings } = useScorecardSettings(groupId)
  const { data: template, isLoading: templateLoading } = useScorecardTemplate(groupId)
  const { data: entries, isLoading: entriesLoading } = useScorecardEntries(groupId, weekEndings)
  const { data: goals } = useScorecardGoals(groupId, quarterLabel)

  // Goal editor state
  const [goalEditor, setGoalEditor] = useState<{
    open: boolean
    goalId: string | null
    measureId: string
    measureName: string
    dataType: string
    currentValue: number | null
  }>({ open: false, goalId: null, measureId: '', measureName: '', dataType: 'count', currentValue: null })

  // Detail panel state
  const [detailPanel, setDetailPanel] = useState<{
    open: boolean
    entryId: string | null
    measureId: string
    weekEnding: string
  }>({ open: false, entryId: null, measureId: '', weekEnding: '' })

  // Find measure info for detail panel
  const detailMeasure = useMemo(() => {
    if (!template || !detailPanel.measureId) return null
    for (const section of template.scorecard_sections || []) {
      for (const measure of section.scorecard_measures || []) {
        if (measure.id === detailPanel.measureId) return measure
      }
    }
    return null
  }, [template, detailPanel.measureId])

  // Find entry value for detail panel
  const detailEntry = useMemo(() => {
    if (!entries || !detailPanel.measureId || !detailPanel.weekEnding) return null
    return entries.find(
      (e: any) => e.measure_id === detailPanel.measureId && e.week_ending === detailPanel.weekEnding
    )
  }, [entries, detailPanel.measureId, detailPanel.weekEnding])

  const isLoading = templateLoading || entriesLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Scorecard</h1>
        </div>

        {/* Sub-navigation tabs */}
        <Tabs defaultValue="scorecard">
          <TabsList>
            <TabsTrigger value="scorecard" asChild>
              <Link href={`/groups/${groupId}/scorecard`}>Pipeline</Link>
            </TabsTrigger>
            <TabsTrigger value="campaigns" asChild>
              <Link href={`/groups/${groupId}/scorecard/campaigns`}>Campaigns</Link>
            </TabsTrigger>
            <TabsTrigger value="dashboard" asChild>
              <Link href={`/groups/${groupId}/scorecard/dashboard`}>Dashboard</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Time controls */}
      <ScorecardTimeHeader
        weekEndingDay={settings?.week_ending_day}
        onWeekEndingsChange={setWeekEndings}
      />

      {/* Grid */}
      {isLoading ? (
        <TableSkeleton rows={10} />
      ) : !template ? (
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title="No scorecard configured"
          description="A scorecard template needs to be set up for this group. Contact your system administrator."
        />
      ) : (
        <ScorecardGrid
          template={template}
          entries={entries || []}
          goals={goals || []}
          weekEndings={weekEndings}
          groupId={groupId}
          quarter={quarterLabel}
          onCellClick={(entryId, measureId, weekEnding) => {
            setDetailPanel({ open: true, entryId, measureId, weekEnding })
          }}
          onGoalEdit={(goalId, measureId, measureName, dataType, currentValue) => {
            setGoalEditor({ open: true, goalId, measureId, measureName, dataType, currentValue })
          }}
        />
      )}

      {/* Goal editor dialog */}
      <GoalEditor
        open={goalEditor.open}
        onOpenChange={(open) => setGoalEditor((prev) => ({ ...prev, open }))}
        goalId={goalEditor.goalId}
        measureId={goalEditor.measureId}
        measureName={goalEditor.measureName}
        dataType={goalEditor.dataType}
        quarter={quarterLabel}
        currentValue={goalEditor.currentValue}
        groupId={groupId}
      />

      {/* Detail line items panel */}
      <DetailLineItemsPanel
        open={detailPanel.open}
        onOpenChange={(open) => setDetailPanel((prev) => ({ ...prev, open }))}
        entryId={detailPanel.entryId}
        measureName={detailMeasure?.name || ''}
        entryValue={detailEntry?.value ?? null}
        dataType={detailMeasure?.data_type || 'count'}
        weekEnding={detailPanel.weekEnding}
      />
    </div>
  )
}
