'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { CreateMeetingButton } from '@/components/create-meeting-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/empty-state'

export default function MeetingsPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const supabase = createClient()

  const { data: meetings, isLoading } = useSWR(`meetings-${groupId}`, async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*, meeting_attendees(id, score)')
      .eq('group_id', groupId)
      .order('meeting_date', { ascending: false })
    if (error) throw error
    return data
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Meetings</h1>
        </div>
        <CreateMeetingButton groupId={groupId} />
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-stagger">
          <TableSkeleton rows={4} />
        </div>
      ) : meetings?.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-7 w-7" />}
          title="No meetings yet"
          description="Start your first L10 meeting to begin tracking team alignment and accountability."
        />
      ) : (
        <div className="table-striped">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Attendees</TableHead>
              <TableHead>Avg Score</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings?.map((meeting: any) => (
              <TableRow key={meeting.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{meeting.meeting_date}</TableCell>
                <TableCell>{meeting.meeting_attendees?.length || 0}</TableCell>
                <TableCell>
                  {meeting.average_score
                    ? <Badge>{Number(meeting.average_score).toFixed(1)}</Badge>
                    : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/groups/${groupId}/meetings/${meeting.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  )
}
