'use client'

import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import {
  useScorecardTemplate,
  useScorecardEntries,
  useScorecardGoals,
  useScorecardSettings,
} from '@/hooks/use-scorecard'
import { ScorecardGrid } from './scorecard-grid'
import { EntryStatusBadge } from './entry-status-badge'
import { DetailLineItemsPanel } from './detail-line-items-panel'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { getWeekEnding, formatDate, getCurrentQuarterLabel } from '@/lib/scorecard-utils'
import { mutate } from 'swr'

interface MeetingScorecardReviewProps {
  groupId: string
  meetingDate: string
  attendees: { id: string; user: { id: string; full_name: string } }[]
}

export function MeetingScorecardReview({ groupId, meetingDate, attendees }: MeetingScorecardReviewProps) {
  const { user } = useUser()
  const supabase = createClient()
  const quarterLabel = getCurrentQuarterLabel()

  const { data: settings } = useScorecardSettings(groupId)
  const weekEndingDay = settings?.week_ending_day || 'friday'

  // Determine the relevant week ending for this meeting
  const meetingWeekEnding = useMemo(() => {
    const d = new Date(meetingDate + 'T00:00:00')
    return formatDate(getWeekEnding(d, weekEndingDay))
  }, [meetingDate, weekEndingDay])

  const weekEndings = useMemo(() => [meetingWeekEnding], [meetingWeekEnding])

  const { data: template } = useScorecardTemplate(groupId)
  const { data: entries } = useScorecardEntries(groupId, weekEndings)
  const { data: goals } = useScorecardGoals(groupId, quarterLabel)

  // Calculate entry status per attendee
  const entryStatuses = useMemo(() => {
    if (!template || !entries) return []

    // Get all non-calculated measure IDs
    const measureIds = new Set<string>()
    template.scorecard_sections?.forEach((s: any) => {
      s.scorecard_measures?.forEach((m: any) => {
        if (!m.is_calculated) measureIds.add(m.id)
      })
    })

    return attendees.map((att) => {
      const hasEntry = entries.some(
        (e: any) => e.user_id === att.user.id && e.week_ending === meetingWeekEnding
      )
      return {
        userName: att.user.full_name,
        hasUpdated: hasEntry,
      }
    })
  }, [template, entries, attendees, meetingWeekEnding])

  // Detail panel state
  const [detailPanel, setDetailPanel] = useState<{
    open: boolean
    entryId: string | null
    measureId: string
    weekEnding: string
  }>({ open: false, entryId: null, measureId: '', weekEnding: '' })

  const detailMeasure = useMemo(() => {
    if (!template || !detailPanel.measureId) return null
    for (const section of template.scorecard_sections || []) {
      for (const measure of section.scorecard_measures || []) {
        if (measure.id === detailPanel.measureId) return measure
      }
    }
    return null
  }, [template, detailPanel.measureId])

  const detailEntry = useMemo(() => {
    if (!entries || !detailPanel.measureId || !detailPanel.weekEnding) return null
    return entries.find(
      (e: any) => e.measure_id === detailPanel.measureId && e.week_ending === detailPanel.weekEnding
    )
  }, [entries, detailPanel.measureId, detailPanel.weekEnding])

  // Create issue from scorecard
  const handleCreateIssue = useCallback(async (measureName: string, value: number | null, goal: number | null) => {
    if (!user) return
    const description = goal != null
      ? `${measureName}: actual ${value ?? 0} vs goal ${goal} (week ending ${meetingWeekEnding})`
      : `${measureName}: review needed (week ending ${meetingWeekEnding})`

    await supabase.from('issues').insert({
      group_id: groupId,
      raised_by: user.id,
      description,
      priority: 2,
      status: 'open',
    })

    mutate(`issues-${groupId}`)
  }, [user, supabase, groupId, meetingWeekEnding])

  if (!template) {
    return <p className="text-sm text-muted-foreground">No scorecard configured for this group.</p>
  }

  return (
    <div className="space-y-4">
      {/* Entry status indicators */}
      <div className="flex items-center gap-4 flex-wrap p-3 rounded-lg bg-muted/30 border">
        <span className="text-sm font-medium shrink-0">Update Status:</span>
        {entryStatuses.map((status) => (
          <EntryStatusBadge
            key={status.userName}
            userName={status.userName}
            hasUpdated={status.hasUpdated}
          />
        ))}
      </div>

      {/* Scorecard grid in read-only mode */}
      <ScorecardGrid
        template={template}
        entries={entries || []}
        goals={goals || []}
        weekEndings={weekEndings}
        groupId={groupId}
        quarter={quarterLabel}
        readOnly={true}
        onCellClick={(entryId, measureId, weekEnding) => {
          setDetailPanel({ open: true, entryId, measureId, weekEnding })
        }}
        onCreateIssue={handleCreateIssue}
      />

      {/* Create Issue button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCreateIssue('Scorecard Review', null, null)}
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Create Issue from Scorecard
        </Button>
      </div>

      {/* Detail panel */}
      <DetailLineItemsPanel
        open={detailPanel.open}
        onOpenChange={(open) => setDetailPanel((prev) => ({ ...prev, open }))}
        entryId={detailPanel.entryId}
        measureName={detailMeasure?.name || ''}
        entryValue={detailEntry?.value ?? null}
        dataType={detailMeasure?.data_type || 'count'}
        weekEnding={detailPanel.weekEnding}
        readOnly={true}
      />
    </div>
  )
}
