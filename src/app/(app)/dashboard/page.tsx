'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { useQuarters } from '@/hooks/use-rocks'
import { DashboardCard, RocksByGroupTable, RocksByPersonTable } from '@/components/dashboard-grid'
import { QuarterSelector } from '@/components/quarter-selector'
import { useState, useEffect } from 'react'
import { Target, TrendingUp, AlertCircle, Star, LayoutDashboard } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function DashboardPage() {
  const supabase = createClient()
  const { data: quarters } = useQuarters()
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)

  useEffect(() => {
    if (quarters && !selectedQuarter) {
      const current = quarters.find((q: any) => q.is_current)
      if (current) setSelectedQuarter(current.id)
      else if (quarters.length > 0) setSelectedQuarter(quarters[0].id)
    }
  }, [quarters, selectedQuarter])

  const { data: rocks } = useSWR(
    selectedQuarter ? `dashboard-rocks-${selectedQuarter}` : null,
    async () => {
      const { data } = await supabase
        .from('rocks')
        .select('*, owner:profiles!owner_id(full_name), group:groups!group_id(name)')
        .eq('quarter_id', selectedQuarter!)
        .eq('is_archived', false)
      return data || []
    }
  )

  const { data: openIssueCount } = useSWR('dashboard-issues', async () => {
    const { count } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false)
      .neq('status', 'closed')
    return count || 0
  })

  const { data: recentMeetings } = useSWR('dashboard-meetings', async () => {
    const { data } = await supabase
      .from('meetings')
      .select('meeting_date, average_score, group:groups!group_id(name)')
      .order('meeting_date', { ascending: false })
      .limit(5)
    return data || []
  })

  // Aggregate rocks by group
  const rocksByGroup: Record<string, { groupName: string; total: number; onTrack: number; offTrack: number }> = {}
  rocks?.forEach((rock: any) => {
    const name = rock.group?.name || 'Unknown'
    if (!rocksByGroup[name]) rocksByGroup[name] = { groupName: name, total: 0, onTrack: 0, offTrack: 0 }
    rocksByGroup[name].total++
    if (rock.status === 'on_track') rocksByGroup[name].onTrack++
    else rocksByGroup[name].offTrack++
  })
  const rocksByGroupData = Object.values(rocksByGroup).map((r) => ({
    ...r,
    pctOnTrack: r.total > 0 ? `${Math.round((r.onTrack / r.total) * 100)}%` : '-',
  }))

  // Aggregate rocks by person
  const rocksByPerson: Record<string, { personName: string; total: number; onTrack: number; offTrack: number }> = {}
  rocks?.forEach((rock: any) => {
    const name = rock.owner?.full_name || 'Unknown'
    if (!rocksByPerson[name]) rocksByPerson[name] = { personName: name, total: 0, onTrack: 0, offTrack: 0 }
    rocksByPerson[name].total++
    if (rock.status === 'on_track') rocksByPerson[name].onTrack++
    else rocksByPerson[name].offTrack++
  })
  const rocksByPersonData = Object.values(rocksByPerson)

  const totalRocks = rocks?.length || 0
  const onTrackRocks = rocks?.filter((r: any) => r.status === 'on_track').length || 0
  const onTrackPct = totalRocks > 0 ? Math.round((onTrackRocks / totalRocks) * 100) : 0
  const pctOnTrack = totalRocks > 0 ? `${onTrackPct}%` : '-'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </div>
        <QuarterSelector value={selectedQuarter} onChange={setSelectedQuarter} />
      </div>

      <div className="grid gap-4 md:grid-cols-4 animate-stagger">
        <DashboardCard
          title="Total Rocks"
          value={totalRocks}
          icon={<Target className="h-5 w-5" />}
          accent="blue"
        />
        <DashboardCard
          title="On Track"
          value={onTrackRocks}
          subtitle={pctOnTrack}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
          progress={onTrackPct}
        />
        <DashboardCard
          title="Open Issues"
          value={openIssueCount || 0}
          icon={<AlertCircle className="h-5 w-5" />}
          accent="red"
        />
        <DashboardCard
          title="Last Meeting Score"
          value={recentMeetings?.[0]?.average_score ? Number(recentMeetings[0].average_score).toFixed(1) : '-'}
          subtitle={(recentMeetings?.[0]?.group as any)?.name}
          icon={<Star className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 animate-stagger">
        <RocksByGroupTable data={rocksByGroupData} />
        <RocksByPersonTable data={rocksByPersonData} />
      </div>

      {recentMeetings && recentMeetings.length > 0 && (
        <Card className="card-hover animate-fade-in p-4">
          <h3 className="font-semibold mb-3">Recent Meetings</h3>
          <div className="space-y-2 table-striped">
            {recentMeetings.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm border-b pb-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <span>{m.meeting_date} - {m.group?.name}</span>
                <span className="font-medium">{m.average_score ? `${Number(m.average_score).toFixed(1)}/10` : 'No scores'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
