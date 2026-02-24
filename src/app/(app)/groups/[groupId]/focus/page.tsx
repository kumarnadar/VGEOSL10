'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useFocusSnapshot, useGroupFocusSnapshots, useWeekDates } from '@/hooks/use-focus'
import { WeekNavigator } from '@/components/week-navigator'
import { FocusTable } from '@/components/focus-table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mutate } from 'swr'

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

  if (!user) return <p className="text-muted-foreground">Loading...</p>

  if (!weekDates || weekDates.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Focus Tracker</h1>
        <p className="text-muted-foreground">No focus weeks created yet.</p>
        <Button onClick={handleCreateFirstSnapshot}>Create First Week</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Focus Tracker</h1>
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
            <p className="text-muted-foreground">No focus data for this week.</p>
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
            <p className="text-muted-foreground">No group focus data for this week.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
