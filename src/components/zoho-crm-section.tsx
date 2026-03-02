// src/components/zoho-crm-section.tsx
'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { DollarSign, TrendingUp, Briefcase, Trophy } from 'lucide-react'

interface ZohoRevenue {
  pipeline: { count: number; value: number }
  won: { count: number; value: number }
  quarterlyTrend: { quarter: string; pipeline: number; won: number }[]
  lastUpdated: string
}

const formatCurrency = (val: number) =>
  val >= 1000000
    ? `$${(val / 1000000).toFixed(1)}M`
    : val >= 1000
      ? `$${(val / 1000).toFixed(0)}K`
      : `$${val}`

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch CRM data')
  return res.json()
}

export function ZohoCrmSection() {
  const { data, error, isLoading } = useSWR<ZohoRevenue>(
    '/api/zoho/revenue',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  if (error) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            CRM data unavailable
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
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
    )
  }

  const stats = [
    { label: 'Pipeline Value', value: formatCurrency(data.pipeline.value), icon: Briefcase, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Won Revenue', value: formatCurrency(data.won.value), icon: Trophy, color: 'text-green-600 dark:text-green-400' },
    { label: 'Open Deals', value: data.pipeline.count, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Won Deals', value: data.won.count, icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
  ]

  return (
    <Card className="card-hover animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            CRM Revenue — {new Date().getFullYear()}
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

          {/* Right: Summary stats */}
          <div className="grid grid-cols-2 gap-4 content-center">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
