'use client'

import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ScoreInputProps {
  attendee: any
  meetingId: string
}

export function ScoreInput({ attendee, meetingId }: ScoreInputProps) {
  const supabase = createClient()

  async function handleScoreChange(score: string) {
    const numScore = parseFloat(score)
    if (isNaN(numScore) || numScore < 1 || numScore > 10) return

    await supabase
      .from('meeting_attendees')
      .update({ score: numScore })
      .eq('id', attendee.id)
    mutate(`meeting-${meetingId}`)
  }

  return (
    <div className="flex items-center gap-3">
      <Label className="min-w-[120px] text-sm">{attendee.user?.full_name}</Label>
      <Input
        type="number"
        min="1"
        max="10"
        step="0.5"
        defaultValue={attendee.score || ''}
        onBlur={(e) => handleScoreChange(e.target.value)}
        placeholder="1-10"
        className="w-24 h-8"
      />
      {attendee.score && (
        <span className="text-sm text-muted-foreground">{attendee.score}/10</span>
      )}
    </div>
  )
}
