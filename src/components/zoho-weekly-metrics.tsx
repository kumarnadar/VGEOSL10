// src/components/zoho-weekly-metrics.tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, CalendarCheck, Briefcase, FileText, Trophy, XCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface GroupedDrilldown {
  userName: string
  items: Record<string, unknown>[]
}

interface MetricData {
  count: number
  drilldown: GroupedDrilldown[]
}

interface DealClosureData {
  count: number
  total: number
  drilldown: GroupedDrilldown[]
}

interface WeeklyMetricsResponse {
  window: { start: string; end: string; label: string }
  metrics: {
    contacts: MetricData
    firstTimeMeetings: MetricData
    newPotentials: MetricData
    proposalsCount: MetricData
    proposalsValue: { total: number }
    dealsWon: DealClosureData
    dealsLost: DealClosureData
  }
  lastUpdated: string
}

const formatCurrency = (val: number) =>
  val >= 1000000
    ? `$${(val / 1000000).toFixed(1)}M`
    : val >= 1000
      ? `$${(val / 1000).toFixed(0)}K`
      : `$${val.toLocaleString()}`

/** Format a date string (YYYY-MM-DD or ISO) as "Mar 7" style. */
const formatDate = (v: unknown): string => {
  const str = String(v || '')
  if (!str) return ''
  const d = new Date(str.length === 10 ? str + 'T00:00:00' : str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch weekly metrics')
  return res.json()
}

type MetricKey = 'contacts' | 'firstTimeMeetings' | 'newPotentials' | 'proposals' | 'dealsWon' | 'dealsLost'

const ACTIVITY_CARDS: {
  key: MetricKey
  label: string
  icon: typeof Users
  color: string
  bgColor: string
}[] = [
  { key: 'contacts', label: 'New Contacts', icon: Users, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  { key: 'firstTimeMeetings', label: '1st Time Meetings', icon: CalendarCheck, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/30' },
  { key: 'newPotentials', label: 'New Potentials', icon: Briefcase, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
]

const OUTCOME_CARDS: {
  key: MetricKey
  label: string
  icon: typeof Users
  color: string
  bgColor: string
}[] = [
  { key: 'proposals', label: 'New Proposals', icon: FileText, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  { key: 'dealsWon', label: 'Deals Won', icon: Trophy, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/30' },
  { key: 'dealsLost', label: 'Deals Lost', icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30' },
]

/** Collapsible user section in drilldown dialog */
function UserSection({
  userName,
  items,
  columns,
  defaultOpen,
}: {
  userName: string
  items: Record<string, unknown>[]
  columns: { key: string; label: string; format?: (v: unknown) => string }[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted text-sm font-medium text-left"
      >
        <span>{userName} ({items.length})</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-xs">{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key} className="text-sm py-1.5">
                    {col.format ? col.format(item[col.key]) : String(item[col.key] || '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

const DRILLDOWN_COLUMNS: Record<MetricKey, { key: string; label: string; format?: (v: unknown) => string }[]> = {
  contacts: [
    { key: 'name', label: 'Name' },
    { key: 'company', label: 'Company' },
    { key: 'notes', label: 'Notes' },
    { key: 'created', label: 'Created', format: formatDate },
  ],
  firstTimeMeetings: [
    { key: 'title', label: 'Event' },
    { key: 'contact', label: 'Contact' },
    { key: 'company', label: 'Company' },
    { key: 'date', label: 'Date', format: formatDate },
  ],
  newPotentials: [
    { key: 'name', label: 'Deal' },
    { key: 'account', label: 'Account' },
    { key: 'amount', label: 'Amount', format: (v) => formatCurrency(Number(v) || 0) },
    { key: 'stage', label: 'Stage' },
    { key: 'created', label: 'Created', format: formatDate },
  ],
  proposals: [
    { key: 'name', label: 'Deal' },
    { key: 'account', label: 'Account' },
    { key: 'amount', label: 'Amount', format: (v) => formatCurrency(Number(v) || 0) },
    { key: 'stage', label: 'Stage' },
    { key: 'closingDate', label: 'Close Date', format: formatDate },
  ],
  dealsWon: [
    { key: 'name', label: 'Deal' },
    { key: 'account', label: 'Account' },
    { key: 'amount', label: 'Amount', format: (v) => formatCurrency(Number(v) || 0) },
    { key: 'closingDate', label: 'Close Date', format: formatDate },
  ],
  dealsLost: [
    { key: 'name', label: 'Deal' },
    { key: 'account', label: 'Account' },
    { key: 'amount', label: 'Amount', format: (v) => formatCurrency(Number(v) || 0) },
    { key: 'closingDate', label: 'Close Date', format: formatDate },
  ],
}

export function ZohoWeeklyMetrics({ groupId }: { groupId?: string }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)

  const { data, error, isLoading } = useSWR<WeeklyMetricsResponse>(
    `/api/zoho/weekly-metrics${groupId ? `?groupId=${groupId}` : ''}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  if (error) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">Weekly metrics unavailable</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const { metrics, window: win } = data

  function getDrilldown(key: MetricKey): GroupedDrilldown[] {
    switch (key) {
      case 'contacts': return metrics.contacts.drilldown
      case 'firstTimeMeetings': return metrics.firstTimeMeetings.drilldown
      case 'newPotentials': return metrics.newPotentials.drilldown
      case 'proposals': return metrics.proposalsCount.drilldown
      case 'dealsWon': return metrics.dealsWon.drilldown
      case 'dealsLost': return metrics.dealsLost.drilldown
    }
  }

  function getDialogTitle(key: MetricKey): string {
    const labels: Record<MetricKey, string> = {
      contacts: 'New Contacts',
      firstTimeMeetings: 'First Time Meetings',
      newPotentials: 'New Potentials',
      proposals: 'New Proposals',
      dealsWon: 'Deals Won',
      dealsLost: 'Deals Lost',
    }
    return `${labels[key]} — ${win.label}`
  }

  function getTotalCount(key: MetricKey): number {
    switch (key) {
      case 'contacts': return metrics.contacts.count
      case 'firstTimeMeetings': return metrics.firstTimeMeetings.count
      case 'newPotentials': return metrics.newPotentials.count
      case 'proposals': return metrics.proposalsCount.count
      case 'dealsWon': return metrics.dealsWon.count
      case 'dealsLost': return metrics.dealsLost.count
    }
  }

  function getCardValue(key: MetricKey): string {
    switch (key) {
      case 'contacts': return String(metrics.contacts.count)
      case 'firstTimeMeetings': return String(metrics.firstTimeMeetings.count)
      case 'newPotentials': return String(metrics.newPotentials.count)
      case 'proposals':
        return `${metrics.proposalsCount.count} / ${formatCurrency(metrics.proposalsValue.total)}`
      case 'dealsWon':
        return `${metrics.dealsWon.count} / ${formatCurrency(metrics.dealsWon.total)}`
      case 'dealsLost':
        return `${metrics.dealsLost.count} / ${formatCurrency(metrics.dealsLost.total)}`
    }
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          CRM Weekly Metrics — {win.label}
        </p>

        {/* Row 1: Activity */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ACTIVITY_CARDS.map((card) => (
            <button
              key={card.key}
              onClick={() => setActiveMetric(card.key)}
              className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:shadow-sm ${card.bgColor}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{getCardValue(card.key)}</p>
            </button>
          ))}
        </div>

        {/* Row 2: Outcomes */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {OUTCOME_CARDS.map((card) => (
            <button
              key={card.key}
              onClick={() => setActiveMetric(card.key)}
              className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:shadow-sm ${card.bgColor}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{getCardValue(card.key)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Drilldown Sheet */}
      <Sheet open={activeMetric !== null} onOpenChange={(open) => { if (!open) setActiveMetric(null) }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {activeMetric && (
            <>
              <SheetHeader className="sticky top-0 bg-background pb-4 border-b mb-4 z-10">
                <SheetTitle>{getDialogTitle(activeMetric)}</SheetTitle>
              </SheetHeader>
              <div className="space-y-3">
                {getDrilldown(activeMetric).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No records found for this period</p>
                ) : (
                  <>
                    {getDrilldown(activeMetric).map((group, i) => (
                      <UserSection
                        key={group.userName}
                        userName={group.userName}
                        items={group.items}
                        columns={DRILLDOWN_COLUMNS[activeMetric]}
                        defaultOpen={i === 0}
                      />
                    ))}
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      Total: {getTotalCount(activeMetric)} records
                      {(activeMetric === 'proposals' || activeMetric === 'dealsWon' || activeMetric === 'dealsLost') &&
                        ` — ${formatCurrency(
                          activeMetric === 'proposals' ? metrics.proposalsValue.total
                          : activeMetric === 'dealsWon' ? metrics.dealsWon.total
                          : metrics.dealsLost.total
                        )}`
                      }
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
