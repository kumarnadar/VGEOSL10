'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatWeekHeader } from '@/lib/scorecard-utils'

interface TrendLineChartProps {
  data: { weekEnding: string; value: number }[]
  goalPacePerWeek?: number
  dataType: string
  label: string
}

export function TrendLineChart({ data, goalPacePerWeek, dataType, label }: TrendLineChartProps) {
  const chartData = data.map((d) => ({
    name: formatWeekHeader(d.weekEnding),
    value: d.value,
    goal: goalPacePerWeek ?? undefined,
  }))

  const formatTick = (val: number) => {
    if (dataType === 'currency') {
      return val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`
    }
    return String(val)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatTick} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any) => [formatTick(Number(value)), 'Value']}
              contentStyle={{
                fontSize: 12,
                backgroundColor: 'var(--popover)',
                color: 'var(--popover-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            {goalPacePerWeek != null && (
              <ReferenceLine
                y={goalPacePerWeek}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                label={{ value: 'Goal pace', position: 'right', fontSize: 11 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
