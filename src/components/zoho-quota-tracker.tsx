// src/components/zoho-quota-tracker.tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelProps,
} from 'recharts'
import { Target, ChevronDown, ChevronRight } from 'lucide-react'

interface Deal {
  name: string
  account: string
  amount: number
  stage: string
  closingDate: string
}

interface QuotaUser {
  name: string
  zohoUserId: string
  quota: number | null
  pipeline: number
  won: number
  pipelineDeals: Deal[]
  wonDeals: Deal[]
}

interface QuotaTrackerResponse {
  quarter: number
  year: number
  users: QuotaUser[]
  lastUpdated: string
}

const formatCurrency = (val: number) =>
  val >= 1000000
    ? `$${(val / 1000000).toFixed(1)}M`
    : val >= 1000
      ? `$${(val / 1000).toFixed(0)}K`
      : `$${val.toLocaleString()}`

const formatDate = (v: unknown): string => {
  const str = String(v || '')
  if (!str) return ''
  const d = new Date(str.length === 10 ? str + 'T00:00:00' : str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch quota tracker data')
  return res.json()
}

function getCurrentQuarterAndYear(): { quarter: number; year: number } {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const quarter = Math.ceil(month / 3)
  return { quarter, year: now.getFullYear() }
}

/** Collapsible deal section inside the drilldown sheet */
function DealSection({
  title,
  deals,
  accentColor,
  defaultOpen,
  showStage,
}: {
  title: string
  deals: Deal[]
  accentColor: string
  defaultOpen: boolean
  showStage: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const total = deals.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted text-sm font-medium text-left"
      >
        <span className={accentColor}>
          {title} ({deals.length} deals — {formatCurrency(total)})
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        deals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3 px-4">No deals</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Deal</TableHead>
                <TableHead className="text-xs">Account</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                {showStage && <TableHead className="text-xs">Stage</TableHead>}
                <TableHead className="text-xs">Close Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm py-1.5">{deal.name}</TableCell>
                  <TableCell className="text-sm py-1.5">{deal.account}</TableCell>
                  <TableCell className="text-sm py-1.5">{formatCurrency(deal.amount)}</TableCell>
                  {showStage && <TableCell className="text-sm py-1.5">{deal.stage}</TableCell>}
                  <TableCell className="text-sm py-1.5">{formatDate(deal.closingDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}
    </div>
  )
}

/** Custom tooltip for the horizontal bar chart */
function QuotaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { quota: number | null } }[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const quota = payload[0]?.payload?.quota ?? null
  const won = payload.find((p) => p.name === 'won')?.value ?? 0
  const pipeline = payload.find((p) => p.name === 'pipeline')?.value ?? 0

  return (
    <div
      style={{
        fontSize: 12,
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '8px 12px',
      }}
    >
      <p className="font-medium mb-1">{label}</p>
      <p style={{ color: 'hsl(142, 76%, 36%)' }}>Won: {formatCurrency(won)}</p>
      <p style={{ color: 'hsl(var(--primary))' }}>Pipeline: {formatCurrency(pipeline)}</p>
      <p className="text-muted-foreground mt-1">
        Quota: {quota !== null ? formatCurrency(quota) : 'No quota'}
      </p>
    </div>
  )
}

interface QuotaBarLabelProps extends LabelProps {
  quota?: number | null
  won?: number
  pipeline?: number
}

/** Custom bar label rendered to the right of each stacked bar */
function QuotaBarLabel({
  x,
  y,
  width,
  height,
  quota,
  won,
  pipeline,
}: QuotaBarLabelProps) {
  const nx = Number(x)
  const ny = Number(y)
  const nw = Number(width)
  const nh = Number(height)
  if (isNaN(nx) || isNaN(ny) || isNaN(nw) || isNaN(nh)) return null

  const total = (won ?? 0) + (pipeline ?? 0)
  let label: string

  if (quota !== null && quota !== undefined && quota > 0) {
    const pct = Math.round((total / quota) * 100)
    label = `${formatCurrency(total)} / ${formatCurrency(quota)} (${pct}%)`
  } else {
    label = formatCurrency(total)
  }

  return (
    <text
      x={nx + nw + 8}
      y={ny + nh / 2}
      dominantBaseline="middle"
      style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
    >
      {label}
    </text>
  )
}

export function ZohoQuotaTracker({ groupId }: { groupId?: string }) {
  const { quarter: defaultQ, year: defaultY } = getCurrentQuarterAndYear()
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQ)
  const [selectedYear, setSelectedYear] = useState(defaultY)
  const [activeUser, setActiveUser] = useState<QuotaUser | null>(null)

  const { data, error, isLoading } = useSWR<QuotaTrackerResponse>(
    `/api/zoho/quota-tracker?quarter=${selectedQuarter}&year=${selectedYear}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const quarterLabel = `Q${selectedQuarter} ${selectedYear}`

  const quarterOptions = [1, 2, 3, 4].map((q) => ({
    value: `${q}-${selectedYear}`,
    label: `Q${q} ${selectedYear}`,
    quarter: q,
    year: selectedYear,
  }))

  if (error) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">Quota data unavailable</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const users = data.users

  // Compute chart data and domain
  const chartData = users.map((u) => ({
    name: u.name,
    won: u.won,
    pipeline: u.pipeline,
    quota: u.quota,
  }))

  const maxValue = users.reduce((max, u) => {
    const total = u.won + u.pipeline
    const candidates = [total, u.quota ?? 0]
    return Math.max(max, ...candidates)
  }, 0)

  const chartHeight = Math.max(200, users.length * 50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleBarClick(data: any) {
    if (!data?.activePayload?.[0]) return
    const clickedName = data.activePayload[0].payload.name as string
    const user = users.find((u) => u.name === clickedName) ?? null
    setActiveUser(user)
  }

  return (
    <>
      <Card className="card-hover animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5" />
              Sales Quota — {quarterLabel}
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select
                value={`${selectedQuarter}-${selectedYear}`}
                onValueChange={(val) => {
                  const opt = quarterOptions.find((o) => o.value === val)
                  if (opt) {
                    setSelectedQuarter(opt.quarter)
                    setSelectedYear(opt.year)
                  }
                }}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Updated {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No quota data available for {quarterLabel}
            </p>
          ) : (
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 5, right: 220, left: 10, bottom: 5 }}
                  onClick={handleBarClick}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={110}
                  />
                  <XAxis
                    type="number"
                    domain={[0, maxValue > 0 ? maxValue * 1.05 : 100]}
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    content={<QuotaTooltip />}
                    cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                  />
                  <Bar
                    dataKey="won"
                    name="won"
                    stackId="a"
                    fill="hsl(142, 76%, 36%)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="pipeline"
                    name="pipeline"
                    stackId="a"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    label={(props: LabelProps) => {
                      const idx = (props as LabelProps & { index?: number }).index ?? -1
                      const entry = chartData[idx]
                      return (
                        <QuotaBarLabel
                          {...props}
                          quota={entry?.quota ?? null}
                          won={entry?.won ?? 0}
                          pipeline={entry?.pipeline ?? 0}
                        />
                      )
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drilldown Sheet */}
      <Sheet open={activeUser !== null} onOpenChange={(open) => { if (!open) setActiveUser(null) }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {activeUser && (
            <>
              <SheetHeader className="sticky top-0 bg-background pb-4 border-b mb-4 z-10">
                <SheetTitle>{activeUser.name} — {quarterLabel}</SheetTitle>
                <div className="flex gap-4 text-sm text-muted-foreground pt-1">
                  <span>
                    Won: <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(activeUser.won)}</span>
                  </span>
                  <span>
                    Pipeline: <span className="font-medium text-primary">{formatCurrency(activeUser.pipeline)}</span>
                  </span>
                  {activeUser.quota !== null && (
                    <span>
                      Quota: <span className="font-medium">{formatCurrency(activeUser.quota)}</span>
                      {' '}
                      <span className="text-xs">
                        ({Math.round(((activeUser.won + activeUser.pipeline) / activeUser.quota) * 100)}% coverage)
                      </span>
                    </span>
                  )}
                </div>
              </SheetHeader>
              <div className="space-y-3">
                <DealSection
                  title="Won Deals"
                  deals={activeUser.wonDeals}
                  accentColor="text-green-600 dark:text-green-400 font-medium"
                  defaultOpen={true}
                  showStage={false}
                />
                <DealSection
                  title="Pipeline Deals"
                  deals={activeUser.pipelineDeals}
                  accentColor="text-primary font-medium"
                  defaultOpen={activeUser.wonDeals.length === 0}
                  showStage={true}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
