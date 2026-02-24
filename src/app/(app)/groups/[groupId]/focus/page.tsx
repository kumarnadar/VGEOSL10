'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ListChecks } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useGroupFocusSnapshots, useWeekDates } from '@/hooks/use-focus'
import { WeekNavigator } from '@/components/week-navigator'
import { FocusTable } from '@/components/focus-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mutate } from 'swr'
import { TableSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/empty-state'

export default function FocusPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const { user } = useUser()
  const [weekIndex, setWeekIndex] = useState(0)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // Set default member to current user
  useEffect(() => {
    if (user && !selectedMemberId) {
      setSelectedMemberId(user.id)
    }
  }, [user, selectedMemberId])

  const { data: weekDates } = useWeekDates(user?.id || null, groupId)
  const currentWeekDate = weekDates?.[weekIndex]?.week_date || null

  // Compute isCurrentWeek from date instead of DB flag
  const isCurrentWeek = (() => {
    if (!currentWeekDate) return false
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const thisMonday = monday.toISOString().split('T')[0]
    return currentWeekDate === thisMonday
  })()

  // Get all group snapshots to build member list
  const { data: groupSnapshots } = useGroupFocusSnapshots(groupId, currentWeekDate)

  // Find the selected member's snapshot
  const selectedSnapshot = groupSnapshots?.find(
    (snap: any) => snap.user?.id === selectedMemberId
  ) || null

  // Build member list from group snapshots
  const members = groupSnapshots?.map((snap: any) => ({
    id: snap.user?.id,
    name: snap.user?.full_name || 'Unknown',
  })) || []

  // Ensure current user is in the list even if they have no snapshot
  if (user && !members.find((m: any) => m.id === user.id)) {
    members.unshift({ id: user.id, name: user.full_name || user.email || 'Me' })
  }

  const isViewingSelf = selectedMemberId === user?.id
  const canEdit = isViewingSelf && isCurrentWeek

  const supabase = createClient()

  async function handleStartNewWeek() {
    if (!user) return

    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const weekDate = monday.toISOString().split('T')[0]

    await supabase.rpc('start_new_week', {
      p_user_id: user.id,
      p_group_id: groupId,
      p_new_week_date: weekDate,
    })

    mutate(`week-dates-${user.id}-${groupId}`)
    mutate(`focus-${user.id}-${groupId}-${weekDate}`)
    mutate(`group-focus-${groupId}-${weekDate}`)
    setWeekIndex(0)
  }

  async function handleCreateFirstSnapshot() {
    if (!user) return

    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const weekDate = monday.toISOString().split('T')[0]

    await supabase.from('focus_snapshots').insert({
      user_id: user.id,
      group_id: groupId,
      week_date: weekDate,
      is_current: true,
    })

    mutate(`week-dates-${user.id}-${groupId}`)
    setWeekIndex(0)
  }

  if (!user) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ListChecks className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Top 10</h1>
      </div>
      <TableSkeleton rows={5} />
    </div>
  )

  if (!weekDates || weekDates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Top 10</h1>
        </div>
        <EmptyState
          icon={<ListChecks className="h-7 w-7" />}
          title="No focus weeks yet"
          description="Create your first week to start tracking your top 10 priorities."
          action={{ label: 'Create First Week', onClick: handleCreateFirstSnapshot }}
        />
      </div>
    )
  }

  const selectedMemberName = members.find((m: any) => m.id === selectedMemberId)?.name || ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Top 10</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMemberId || ''} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="w-36 sm:w-48">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member: any) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}{member.id === user.id ? ' (Me)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <WeekNavigator
            weekDates={weekDates}
            currentIndex={weekIndex}
            onChange={setWeekIndex}
            onStartNewWeek={handleStartNewWeek}
            isCurrentWeek={isCurrentWeek}
          />
        </div>
      </div>

      {!isViewingSelf && (
        <p className="text-sm text-muted-foreground">
          Viewing {selectedMemberName}&apos;s focus items (read-only)
        </p>
      )}

      {!isCurrentWeek && isViewingSelf && (
        <p className="text-sm text-muted-foreground">Viewing historical week (read-only)</p>
      )}

      {selectedSnapshot ? (
        <FocusTable snapshot={selectedSnapshot} readOnly={!canEdit} />
      ) : isViewingSelf ? (
        <EmptyState
          icon={<ListChecks className="h-7 w-7" />}
          title="No focus data"
          description="No focus items recorded for this week yet."
        />
      ) : (
        <EmptyState
          icon={<ListChecks className="h-7 w-7" />}
          title="No data"
          description={`${selectedMemberName} has no focus items for this week.`}
        />
      )}
    </div>
  )
}
