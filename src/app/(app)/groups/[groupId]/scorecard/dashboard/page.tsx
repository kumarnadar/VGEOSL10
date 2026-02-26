'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  useScorecardTemplate,
  useScorecardEntries,
  useScorecardGoals,
  useScorecardSettings,
} from '@/hooks/use-scorecard'
import { useCampaigns, useCampaignData, useCampaignMetrics } from '@/hooks/use-campaigns'
import { ProgressBar } from '@/components/scorecard/progress-bar'
import { TrendLineChart } from '@/components/scorecard/trend-line-chart'
import { CampaignComparisonChart } from '@/components/scorecard/campaign-comparison-chart'
import { ScorecardTimeHeader } from '@/components/scorecard/scorecard-time-header'
import { TableSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCurrentQuarterLabel } from '@/lib/scorecard-utils'
import Link from 'next/link'

export default function ScorecardDashboardPage() {
  const params = useParams()
  const groupId = params.groupId as string

  const quarterLabel = getCurrentQuarterLabel()
  const [weekEndings, setWeekEndings] = useState<string[]>([])
  const [selectedSection, setSelectedSection] = useState<string>('all')

  const { data: settings } = useScorecardSettings(groupId)
  const { data: template, isLoading: templateLoading } = useScorecardTemplate(groupId)
  const { data: entries } = useScorecardEntries(groupId, weekEndings)
  const { data: goals } = useScorecardGoals(groupId, quarterLabel)
  const { data: campaigns } = useCampaigns(groupId)
  const { data: metrics } = useCampaignMetrics(groupId)

  // Build lookup maps
  const entryMap = useMemo(() => {
    const map = new Map<string, any>()
    entries?.forEach((e: any) => map.set(`${e.measure_id}-${e.week_ending}`, e))
    return map
  }, [entries])

  const goalMap = useMemo(() => {
    const map = new Map<string, number>()
    goals?.forEach((g: any) => map.set(g.measure_id, g.goal_value))
    return map
  }, [goals])

  // Filter sections
  const sections = template?.scorecard_sections || []
  const filteredSections = selectedSection === 'all'
    ? sections
    : sections.filter((s: any) => s.id === selectedSection)

  // Build progress bars data
  const progressData = useMemo(() => {
    const items: { label: string; actual: number; goal: number; dataType: string; measureId: string }[] = []
    filteredSections.forEach((section: any) => {
      section.scorecard_measures?.forEach((measure: any) => {
        if (measure.is_calculated) return
        const goal = goalMap.get(measure.id)
        if (!goal) return
        let total = 0
        weekEndings.forEach((week) => {
          const entry = entryMap.get(`${measure.id}-${week}`)
          if (entry?.value != null) total += Number(entry.value)
        })
        items.push({
          label: `${section.name}: ${measure.name}`,
          actual: total,
          goal,
          dataType: measure.data_type,
          measureId: measure.id,
        })
      })
    })
    return items
  }, [filteredSections, weekEndings, entryMap, goalMap])

  // Build trend data for first 3 measures with goals
  const trendData = useMemo(() => {
    return progressData.slice(0, 3).map((item) => {
      const weeklyValues = weekEndings.map((week) => {
        const entry = entryMap.get(`${item.measureId}-${week}`)
        return { weekEnding: week, value: entry?.value != null ? Number(entry.value) : 0 }
      })
      const weeksInQuarter = 13
      const goalPace = item.goal / weeksInQuarter
      return { label: item.label, data: weeklyValues, goalPace, dataType: item.dataType }
    })
  }, [progressData, weekEndings, entryMap])

  // Build campaign comparison data
  const campaignComparisonData = useMemo(() => {
    if (!campaigns) return []
    return campaigns
      .filter((c: any) => c.status === 'active')
      .slice(0, 8)
      .map((c: any) => ({
        name: c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name,
        outreach: 0,
        connects: 0,
        meetings: 0,
        potentials: 0,
      }))
  }, [campaigns])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Scorecard Dashboard</h1>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="scorecard" asChild>
              <Link href={`/groups/${groupId}/scorecard`}>Pipeline</Link>
            </TabsTrigger>
            <TabsTrigger value="campaigns" asChild>
              <Link href={`/groups/${groupId}/scorecard/campaigns`}>Campaigns</Link>
            </TabsTrigger>
            <TabsTrigger value="dashboard" asChild>
              <Link href={`/groups/${groupId}/scorecard/dashboard`}>Dashboard</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <ScorecardTimeHeader
          weekEndingDay={settings?.week_ending_day}
          onWeekEndingsChange={setWeekEndings}
        />
        {sections.length > 0 && (
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {sections.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {templateLoading ? (
        <TableSkeleton rows={6} />
      ) : !template ? (
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title="No scorecard configured"
          description="Set up a scorecard template to see dashboard visualizations."
        />
      ) : progressData.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title="No data yet"
          description="Enter scorecard data and set goals to see progress visualizations."
        />
      ) : (
        <div className="space-y-8">
          {/* Progress bars */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Goal Progress ({quarterLabel})</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {progressData.map((item) => (
                <ProgressBar
                  key={item.measureId}
                  label={item.label}
                  actual={item.actual}
                  goal={item.goal}
                  dataType={item.dataType}
                />
              ))}
            </div>
          </div>

          {/* Trend lines */}
          {trendData.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Weekly Trends</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {trendData.map((trend) => (
                  <div key={trend.label} className="rounded-lg border p-4">
                    <TrendLineChart
                      data={trend.data}
                      goalPacePerWeek={trend.goalPace}
                      dataType={trend.dataType}
                      label={trend.label}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campaign comparison */}
          {campaignComparisonData.length > 0 && (
            <div className="rounded-lg border p-4">
              <CampaignComparisonChart campaigns={campaignComparisonData} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
