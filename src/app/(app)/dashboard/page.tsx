'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { useQuarters } from '@/hooks/use-rocks'
import { useUser } from '@/hooks/use-user'
import { DashboardCard, RocksByGroupTable, RocksByPersonTable } from '@/components/dashboard-grid'
import { QuarterSelector } from '@/components/quarter-selector'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { Target, TrendingUp, AlertCircle, Star, LayoutDashboard, ListChecks } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Top10ReviewDialog } from '@/components/top10-review-dialog'

export default function DashboardPage() {
  const supabase = createClient()
  const { user } = useUser()
  const groups = user?.group_members?.map((gm: any) => gm.groups) || []
  const { data: quarters } = useQuarters()
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [top10DialogOpen, setTop10DialogOpen] = useState(false)

  // Compute current week Monday (local time, avoid UTC shift from toISOString)
  const currentWeekMonday = (() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const y = monday.getFullYear()
    const m = String(monday.getMonth() + 1).padStart(2, '0')
    const d = String(monday.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })()

  useEffect(() => {
    if (quarters && !selectedQuarter) {
      const current = quarters.find((q: any) => q.is_current)
      if (current) setSelectedQuarter(current.id)
      else if (quarters.length > 0) setSelectedQuarter(quarters[0].id)
    }
  }, [quarters, selectedQuarter])

  const { data: rocks } = useSWR(
    selectedQuarter ? `dashboard-rocks-${selectedQuarter}-${selectedGroupId || 'all'}` : null,
    async () => {
      let query = supabase
        .from('rocks')
        .select('*, owner:profiles!owner_id(id, full_name), group:groups!group_id(id, name)')
        .eq('quarter_id', selectedQuarter!)
        .eq('is_archived', false)
      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId)
      }
      const { data } = await query
      return data || []
    }
  )

  const { data: openIssueCount } = useSWR(
    `dashboard-issues-${selectedGroupId || 'all'}`,
    async () => {
      let query = supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .neq('status', 'closed')
      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId)
      }
      const { count } = await query
      return count || 0
    }
  )

  const { data: recentMeetings } = useSWR(
    `dashboard-meetings-${selectedGroupId || 'all'}`,
    async () => {
      let query = supabase
        .from('meetings')
        .select('id, meeting_date, average_score, group_id, group:groups!group_id(name)')
        .order('meeting_date', { ascending: false })
        .limit(5)
      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId)
      }
      const { data } = await query
      return data || []
    }
  )

  const { data: focusData } = useSWR(
    `dashboard-focus-${selectedGroupId || 'all'}`,
    async () => {
      // First, find the most recent week_date that has snapshots
      let weekQuery = supabase
        .from('focus_snapshots')
        .select('week_date')
        .order('week_date', { ascending: false })
        .limit(1)
      if (selectedGroupId) {
        weekQuery = weekQuery.eq('group_id', selectedGroupId)
      }
      const { data: weekRow } = await weekQuery
      const latestWeek = weekRow?.[0]?.week_date
      if (!latestWeek) return { snapshots: [], weekDate: null }

      // Now fetch all snapshots for that week
      let query = supabase
        .from('focus_snapshots')
        .select('*, user:profiles!user_id(id, full_name), group:groups!group_id(id, name), focus_items(*)')
        .eq('week_date', latestWeek)
      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId)
      }
      const { data } = await query
      return { snapshots: data || [], weekDate: latestWeek }
    }
  )

  const focusSnapshots = focusData?.snapshots || []
  const focusWeekDate = focusData?.weekDate || null
  const isCurrentWeekFocus = focusWeekDate === currentWeekMonday

  // Aggregate rocks by group
  const rocksByGroup: Record<string, { groupName: string; groupId: string; total: number; onTrack: number; offTrack: number }> = {}
  rocks?.forEach((rock: any) => {
    const name = rock.group?.name || 'Unknown'
    const gid = rock.group?.id || ''
    if (!rocksByGroup[name]) rocksByGroup[name] = { groupName: name, groupId: gid, total: 0, onTrack: 0, offTrack: 0 }
    rocksByGroup[name].total++
    if (rock.status === 'on_track') rocksByGroup[name].onTrack++
    else rocksByGroup[name].offTrack++
  })
  const rocksByGroupData = Object.values(rocksByGroup).map((r) => ({
    ...r,
    pctOnTrack: r.total > 0 ? `${Math.round((r.onTrack / r.total) * 100)}%` : '-',
  }))

  // Aggregate rocks by person
  const rocksByPerson: Record<string, { personName: string; ownerId: string; groupId: string; total: number; onTrack: number; offTrack: number }> = {}
  rocks?.forEach((rock: any) => {
    const name = rock.owner?.full_name || 'Unknown'
    const oid = rock.owner?.id || ''
    const gid = selectedGroupId || rock.group?.id || ''
    if (!rocksByPerson[name]) rocksByPerson[name] = { personName: name, ownerId: oid, groupId: gid, total: 0, onTrack: 0, offTrack: 0 }
    rocksByPerson[name].total++
    if (rock.status === 'on_track') rocksByPerson[name].onTrack++
    else rocksByPerson[name].offTrack++
  })
  const rocksByPersonData = Object.values(rocksByPerson)

  const totalRocks = rocks?.length || 0
  const onTrackRocks = rocks?.filter((r: any) => r.status === 'on_track').length || 0
  const onTrackPct = totalRocks > 0 ? Math.round((onTrackRocks / totalRocks) * 100) : 0
  const pctOnTrack = totalRocks > 0 ? `${onTrackPct}%` : '-'

  // Top 10 items count
  const top10ItemCount = focusSnapshots.reduce(
    (sum: number, snap: any) => sum + (snap.focus_items?.length || 0), 0
  ) || 0

  // Top 10 subtitle: show week date for context
  const top10Subtitle = focusWeekDate
    ? isCurrentWeekFocus
      ? 'This week'
      : `Week of ${new Date(focusWeekDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'No data'

  // Prepare dialog snapshots
  const top10DialogSnapshots = focusSnapshots.map((snap: any) => ({
    userName: snap.user?.full_name || 'Unknown',
    groupName: snap.group?.name || 'Unknown',
    items: (snap.focus_items || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((item: any) => ({
        id: item.id,
        priority: item.priority,
        company_subject: item.company_subject,
        prospect_value: item.prospect_value,
        pipeline_status: item.pipeline_status,
        location: item.location,
        key_decision_maker: item.key_decision_maker,
        weekly_action: item.weekly_action,
        obstacles: item.obstacles,
        resources_needed: item.resources_needed,
        strategy: item.strategy,
      })),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedGroupId || 'all'} onValueChange={(v) => setSelectedGroupId(v === 'all' ? null : v)}>
            <SelectTrigger className="w-36 sm:w-44">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((g: any) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <QuarterSelector value={selectedQuarter} onChange={setSelectedQuarter} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 animate-stagger">
        <DashboardCard
          title="Total Rocks"
          value={totalRocks}
          icon={<Target className="h-5 w-5" />}
          accent="blue"
          href={selectedGroupId ? `/groups/${selectedGroupId}/rocks` : undefined}
        />
        <DashboardCard
          title="On Track"
          value={onTrackRocks}
          subtitle={pctOnTrack}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
          progress={onTrackPct}
          href={selectedGroupId ? `/groups/${selectedGroupId}/rocks?status=on_track` : undefined}
        />
        <DashboardCard
          title="Open Issues"
          value={openIssueCount || 0}
          icon={<AlertCircle className="h-5 w-5" />}
          accent="red"
          href={selectedGroupId ? `/groups/${selectedGroupId}/issues` : undefined}
        />
        <DashboardCard
          title="Last Meeting Score"
          value={recentMeetings?.[0]?.average_score ? Number(recentMeetings[0].average_score).toFixed(1) : '-'}
          subtitle={(recentMeetings?.[0]?.group as any)?.name}
          icon={<Star className="h-5 w-5" />}
          accent="amber"
          href={selectedGroupId && recentMeetings?.[0] ? `/groups/${selectedGroupId}/meetings/${(recentMeetings[0] as any).id}` : undefined}
        />
        <DashboardCard
          title="Top 10 Items"
          value={top10ItemCount}
          subtitle={top10Subtitle}
          icon={<ListChecks className="h-5 w-5" />}
          accent="purple"
          onClick={() => setTop10DialogOpen(true)}
        />
      </div>

      <div className={`grid gap-6 ${selectedGroupId ? '' : 'lg:grid-cols-2'} animate-stagger`}>
        {!selectedGroupId && <RocksByGroupTable data={rocksByGroupData} />}
        <RocksByPersonTable data={rocksByPersonData} />
      </div>

      {recentMeetings && recentMeetings.length > 0 && (
        <Card className="card-hover animate-fade-in p-4">
          <h3 className="font-semibold mb-3">Recent Meetings</h3>
          <div className="space-y-2 table-striped">
            {recentMeetings.map((m: any, i: number) => (
              <Link
                key={i}
                href={`/groups/${(m as any).group_id}/meetings/${(m as any).id}`}
                className="flex items-center justify-between text-sm border-b pb-2 hover:bg-muted/50 rounded-md px-2 -mx-2"
              >
                <span>{m.meeting_date} - {(m as any).group?.name}</span>
                <span className="font-medium">{(m as any).average_score ? `${Number((m as any).average_score).toFixed(1)}/10` : 'No scores'}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Top10ReviewDialog
        open={top10DialogOpen}
        onOpenChange={setTop10DialogOpen}
        title={selectedGroupId
          ? `Top 10 Review — ${groups.find((g: any) => g.id === selectedGroupId)?.name || 'Group'}`
          : 'Top 10 Review — All Groups'}
        snapshots={top10DialogSnapshots}
      />
    </div>
  )
}
