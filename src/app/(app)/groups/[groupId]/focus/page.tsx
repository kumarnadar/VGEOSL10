'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ListChecks } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useFocusSnapshot, useGroupFocusSnapshots, useWeekDates } from '@/hooks/use-focus'
import { WeekNavigator } from '@/components/week-navigator'
import { FocusTable } from '@/components/focus-table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mutate } from 'swr'
import { TableSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/empty-state'

export default function FocusPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const { user } = useUser()
  const [weekIndex, setWeekIndex] = useState(0)
  const [view, setView] = useState<'my' | 'group'>('my')

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

  const { data: mySnapshot } = useFocusSnapshot(user?.id || null, groupId, currentWeekDate)
  const { data: groupSnapshots } = useGroupFocusSnapshots(groupId, currentWeekDate)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Top 10</h1>
        </div>
        <WeekNavigator
          weekDates={weekDates}
          currentIndex={weekIndex}
          onChange={setWeekIndex}
          onStartNewWeek={handleStartNewWeek}
          isCurrentWeek={isCurrentWeek}
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'my' | 'group')}>
        <TabsList>
          <TabsTrigger value="my">My Focus</TabsTrigger>
          <TabsTrigger value="group">Group View</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {mySnapshot ? (
            <FocusTable snapshot={mySnapshot} readOnly={!isCurrentWeek} />
          ) : (
            <EmptyState
              icon={<ListChecks className="h-7 w-7" />}
              title="No focus data"
              description="No focus items recorded for this week."
            />
          )}
        </TabsContent>

        <TabsContent value="group" className="mt-4 space-y-6">
          {groupSnapshots?.map((snap: any) => (
            <FocusTable
              key={snap.id}
              snapshot={snap}
              readOnly={true}
              showOwner={true}
              ownerName={snap.user?.full_name}
            />
          ))}
          {(!groupSnapshots || groupSnapshots.length === 0) && (
            <EmptyState
              icon={<ListChecks className="h-7 w-7" />}
              title="No group data"
              description="No team members have focus data for this week yet."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
