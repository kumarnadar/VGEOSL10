// src/components/zoho-crm-section.tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { DollarSign, TrendingUp, Briefcase, Trophy, ChevronDown, ChevronRight } from 'lucide-react'
import { ZohoWeeklyMetrics } from '@/components/zoho-weekly-metrics'
import { ZohoQuotaTracker } from '@/components/zoho-quota-tracker'

interface DrilldownDeal {
  name: string
  account: string
  amount: number
  stage: string
  closingDate: string
}

interface GroupedDrilldown {
  userName: string
  items: DrilldownDeal[]
}

interface ZohoRevenue {
  pipeline: { count: number; value: number; drilldown: GroupedDrilldown[] }
  won: { count: number; value: number; drilldown: GroupedDrilldown[] }
  quarterlyTrend: { quarter: string; pipeline: number; won: number }[]
  lastUpdated: string
}

const formatCurrency = (val: number) =>
  val >= 1000000
    ? `$${(val / 1000000).toFixed(1)}M`
    : val >= 1000
      ? `$${(val / 1000).toFixed(0)}K`
      : `$${val.toLocaleString()}`

const formatDate = (str: string): string => {
  if (!str) return ''
  const d = new Date(str.length === 10 ? str + 'T00:00:00' : str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch CRM data')
  return res.json()
}

type StatKey = 'pipelineValue' | 'wonRevenue' | 'openDeals' | 'wonDeals'

/** Collapsible user section in drilldown dialog */
function UserSection({
  userName,
  items,
  defaultOpen,
}: {
  userName: string
  items: DrilldownDeal[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const userTotal = items.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted text-sm font-medium text-left"
      >
        <span>{userName} ({items.length} deals — {formatCurrency(userTotal)})</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Deal</TableHead>
              <TableHead className="text-xs">Account</TableHead>
              <TableHead className="text-xs">Amount</TableHead>
              <TableHead className="text-xs">Stage</TableHead>
              <TableHead className="text-xs">Close Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm py-1.5">{item.name}</TableCell>
                <TableCell className="text-sm py-1.5">{item.account}</TableCell>
                <TableCell className="text-sm py-1.5">{formatCurrency(item.amount)}</TableCell>
                <TableCell className="text-sm py-1.5">{item.stage}</TableCell>
                <TableCell className="text-sm py-1.5">{formatDate(item.closingDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export function ZohoCrmSection({ groupId }: { groupId?: string }) {
  const [activeStat, setActiveStat] = useState<StatKey | null>(null)

  const { data, error, isLoading } = useSWR<ZohoRevenue>(
    '/api/zoho/revenue',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  if (error) {
    return (
      <div className="space-y-6">
        <ZohoWeeklyMetrics groupId={groupId} />
        <Card className="animate-fade-in">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              CRM revenue data unavailable
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <ZohoWeeklyMetrics groupId={groupId} />
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              CRM Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground text-sm">Loading CRM data...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats: { key: StatKey; label: string; value: string | number; icon: typeof Briefcase; color: string }[] = [
    { key: 'pipelineValue', label: 'Pipeline Value', value: formatCurrency(data.pipeline.value), icon: Briefcase, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'wonRevenue', label: 'Won Revenue', value: formatCurrency(data.won.value), icon: Trophy, color: 'text-green-600 dark:text-green-400' },
    { key: 'openDeals', label: 'Open Deals', value: data.pipeline.count, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'wonDeals', label: 'Won Deals', value: data.won.count, icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
  ]

  function getDrilldown(key: StatKey): GroupedDrilldown[] {
    switch (key) {
      case 'pipelineValue':
      case 'openDeals':
        return data!.pipeline.drilldown
      case 'wonRevenue':
      case 'wonDeals':
        return data!.won.drilldown
    }
  }

  function getDialogTitle(key: StatKey): string {
    const titles: Record<StatKey, string> = {
      pipelineValue: `Pipeline Deals — ${formatCurrency(data!.pipeline.value)}`,
      wonRevenue: `Won Revenue — ${formatCurrency(data!.won.value)}`,
      openDeals: `Open Deals (${data!.pipeline.count})`,
      wonDeals: `Won Deals (${data!.won.count}) — ${new Date().getFullYear()}`,
    }
    return titles[key]
  }

  return (
    <div className="space-y-6">
      <ZohoWeeklyMetrics groupId={groupId} />
      <Card className="card-hover animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              CRM Revenue — Year to Date
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Updated {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Bar chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.quarterlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value))]}
                    contentStyle={{
                      fontSize: 12,
                      backgroundColor: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="pipeline" name="Pipeline" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="won" name="Won" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Right: Clickable summary stats */}
            <div className="grid grid-cols-2 gap-4 content-center">
              {stats.map((stat) => (
                <button
                  key={stat.key}
                  onClick={() => setActiveStat(stat.key)}
                  className="rounded-lg border p-3 space-y-1 text-left transition-colors hover:border-primary/50 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold">{stat.value}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ZohoQuotaTracker groupId={groupId} />

      {/* Drilldown Sheet */}
      <Sheet open={activeStat !== null} onOpenChange={(open) => { if (!open) setActiveStat(null) }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {activeStat && (
            <>
              <SheetHeader className="sticky top-0 bg-background pb-4 border-b mb-4 z-10">
                <SheetTitle>{getDialogTitle(activeStat)}</SheetTitle>
              </SheetHeader>
              <div className="space-y-3">
                {getDrilldown(activeStat).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No deals found</p>
                ) : (
                  getDrilldown(activeStat).map((group, i) => (
                    <UserSection
                      key={group.userName}
                      userName={group.userName}
                      items={group.items}
                      defaultOpen={i === 0}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
