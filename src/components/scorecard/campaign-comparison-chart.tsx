'use client'

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

interface CampaignComparisonChartProps {
  campaigns: { name: string; outreach: number; connects: number; meetings: number; potentials: number }[]
}

const COLORS = {
  outreach: 'hsl(var(--primary))',
  connects: '#f59e0b',
  meetings: '#10b981',
  potentials: '#8b5cf6',
}

export function CampaignComparisonChart({ campaigns }: CampaignComparisonChartProps) {
  if (campaigns.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Campaign Comparison</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={campaigns} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="outreach" fill={COLORS.outreach} name="Outreach" />
            <Bar dataKey="connects" fill={COLORS.connects} name="Connects" />
            <Bar dataKey="meetings" fill={COLORS.meetings} name="Meetings" />
            <Bar dataKey="potentials" fill={COLORS.potentials} name="Potentials" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
