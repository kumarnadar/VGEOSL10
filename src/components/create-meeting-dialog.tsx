'use client'

import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface CreateMeetingDialogProps {
  groupId: string
}

export function CreateMeetingButton({ groupId }: CreateMeetingDialogProps) {
  const supabase = createClient()
  const router = useRouter()

  async function handleStartMeeting() {
    const today = new Date().toISOString().split('T')[0]

    // Create meeting
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({ group_id: groupId, meeting_date: today })
      .select()
      .single()

    if (error || !meeting) {
      alert('Error creating meeting: ' + (error?.message || 'Unknown error'))
      return
    }

    // Get group members and add as attendees
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)

    if (members && members.length > 0) {
      await supabase.from('meeting_attendees').insert(
        members.map((m: any) => ({
          meeting_id: meeting.id,
          user_id: m.user_id,
        }))
      )
    }

    mutate(`meetings-${groupId}`)
    router.push(`/groups/${groupId}/meetings/${meeting.id}`)
  }

  return (
    <Button onClick={handleStartMeeting}>Start Meeting</Button>
  )
}
