'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { MeetingAgenda } from '@/components/meeting-agenda'
import { ScoreInput } from '@/components/score-input'
import { RockCard } from '@/components/rock-card'
import { IssueBoard } from '@/components/issue-board'
import { TodoList } from '@/components/todo-list'
import { MeetingScorecardReview } from '@/components/scorecard/meeting-scorecard-review'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useRocks, useQuarters } from '@/hooks/use-rocks'

export default function MeetingViewPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const meetingId = params.meetingId as string
  const supabase = createClient()
  const [activeStep, setActiveStep] = useState('checkins')

  const { data: meeting, isLoading } = useSWR(`meeting-${meetingId}`, async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*, meeting_attendees(*, user:profiles!user_id(id, full_name))')
      .eq('id', meetingId)
      .single()
    if (error) throw error
    return data
  })

  const { data: quarters } = useQuarters()
  const currentQuarter = quarters?.find((q: any) => q.is_current)
  const { data: rocks } = useRocks(groupId, currentQuarter?.id || null)

  async function updateCheckin(attendeeId: string, note: string) {
    await supabase.from('meeting_attendees').update({ checkin_note: note }).eq('id', attendeeId)
    mutate(`meeting-${meetingId}`)
  }

  async function updateNotes(notes: string) {
    await supabase.from('meetings').update({ notes }).eq('id', meetingId)
    mutate(`meeting-${meetingId}`)
  }

  if (isLoading || !meeting) {
    return <p className="text-muted-foreground">Loading meeting...</p>
  }

  const attendees = meeting.meeting_attendees || []
  const avgScore = attendees.filter((a: any) => a.score).length > 0
    ? (attendees.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / attendees.filter((a: any) => a.score).length).toFixed(1)
    : null

  return (
    <div className="flex gap-6">
      {/* Agenda sidebar */}
      <div className="w-56 shrink-0">
        <div className="sticky top-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
            &larr; Back
          </Button>
          <p className="text-sm font-medium mb-2">Meeting: {meeting.meeting_date}</p>
          {avgScore && <Badge className="mb-4">Avg: {avgScore}/10</Badge>}
          <MeetingAgenda activeStep={activeStep} onStepChange={setActiveStep} />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 space-y-6">
        {activeStep === 'checkins' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Check-ins</h2>
            <p className="text-sm text-muted-foreground">Share one personal and one professional highlight.</p>
            {attendees.map((att: any) => (
              <div key={att.id} className="rounded-lg border p-3 space-y-2">
                <Label className="font-medium">{att.user?.full_name}</Label>
                <Input
                  defaultValue={att.checkin_note || ''}
                  onBlur={(e) => updateCheckin(att.id, e.target.value)}
                  placeholder="Personal & professional highlights..."
                />
              </div>
            ))}
          </div>
        )}

        {activeStep === 'scorecard' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Scorecard</h2>
            <MeetingScorecardReview
              groupId={groupId}
              meetingDate={meeting.meeting_date}
              attendees={attendees}
            />
          </div>
        )}

        {activeStep === 'rocks' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Rock Review</h2>
            <p className="text-sm text-muted-foreground">Review on track / off track status for current quarter rocks.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {rocks?.map((rock: any) => (
                <RockCard key={rock.id} rock={rock} groupId={groupId} />
              ))}
            </div>
            {(!rocks || rocks.length === 0) && (
              <p className="text-muted-foreground">No rocks for current quarter.</p>
            )}
          </div>
        )}

        {activeStep === 'focus' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Top 10 Review</h2>
            <p className="text-sm text-muted-foreground">Review group focus items for this week.</p>
            <p className="text-sm text-muted-foreground">Navigate to Top 10 for detailed view.</p>
          </div>
        )}

        {activeStep === 'issues' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Issues (IDS)</h2>
            <p className="text-sm text-muted-foreground">Identify, Discuss, Solve. Work through open issues.</p>
            <IssueBoard groupId={groupId} />
          </div>
        )}

        {activeStep === 'conclude' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Conclude & Score</h2>

            <div className="space-y-2">
              <h3 className="font-medium">To-Do Recap</h3>
              <TodoList groupId={groupId} />
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-medium">Meeting Notes</h3>
              <textarea
                defaultValue={meeting.notes || ''}
                onBlur={(e) => updateNotes(e.target.value)}
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Meeting notes..."
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-medium">Rate This Meeting (1-10)</h3>
              {attendees.map((att: any) => (
                <ScoreInput key={att.id} attendee={att} meetingId={meetingId} />
              ))}
              {avgScore && (
                <p className="text-sm font-medium mt-2">Average Score: {avgScore}/10</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
