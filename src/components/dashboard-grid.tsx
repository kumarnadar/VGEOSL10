'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AccentColor = 'blue' | 'green' | 'red' | 'amber'

interface DashboardCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  accent?: AccentColor
  progress?: number
}

const accentBorderMap: Record<AccentColor, string> = {
  blue: 'border-l-primary',
  green: 'border-l-green-500',
  red: 'border-l-destructive',
  amber: 'border-l-amber-500',
}

const accentProgressMap: Record<AccentColor, string> = {
  blue: 'bg-primary',
  green: 'bg-green-500',
  red: 'bg-destructive',
  amber: 'bg-amber-500',
}

export function DashboardCard({ title, value, subtitle, icon, accent, progress }: DashboardCardProps) {
  const borderClass = accent ? `border-l-4 ${accentBorderMap[accent]}` : ''
  const progressBarColor = accent ? accentProgressMap[accent] : 'bg-primary'

  return (
    <Card className={`card-hover animate-fade-in ${borderClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {progress !== undefined && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div
              className={`h-1.5 rounded-full ${progressBarColor}`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

interface RocksByGroupRow {
  groupName: string
  total: number
  onTrack: number
  offTrack: number
  pctOnTrack: string
}

export function RocksByGroupTable({ data }: { data: RocksByGroupRow[] }) {
  return (
    <Card className="card-hover animate-fade-in">
      <CardHeader>
        <CardTitle className="text-base">Rocks by Group</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="table-striped">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Group</th>
                <th className="text-right py-2 font-medium">Total</th>
                <th className="text-right py-2 font-medium">On Track</th>
                <th className="text-right py-2 font-medium">Off Track</th>
                <th className="text-right py-2 font-medium">% On Track</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.groupName} className="border-b hover:bg-muted/50">
                  <td className="py-2">{row.groupName}</td>
                  <td className="text-right py-2">{row.total}</td>
                  <td className="text-right py-2 text-green-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1" />
                    {row.onTrack}
                  </td>
                  <td className="text-right py-2 text-red-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1" />
                    {row.offTrack}
                  </td>
                  <td className="text-right py-2 font-medium">{row.pctOnTrack}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
      </CardContent>
    </Card>
  )
}

interface RocksByPersonRow {
  personName: string
  total: number
  onTrack: number
  offTrack: number
}

export function RocksByPersonTable({ data }: { data: RocksByPersonRow[] }) {
  return (
    <Card className="card-hover animate-fade-in">
      <CardHeader>
        <CardTitle className="text-base">Rocks by Person</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="table-striped">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Person</th>
                <th className="text-right py-2 font-medium">Total</th>
                <th className="text-right py-2 font-medium">On Track</th>
                <th className="text-right py-2 font-medium">Off Track</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.personName} className="border-b hover:bg-muted/50">
                  <td className="py-2">{row.personName}</td>
                  <td className="text-right py-2">{row.total}</td>
                  <td className="text-right py-2 text-green-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1" />
                    {row.onTrack}
                  </td>
                  <td className="text-right py-2 text-red-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1" />
                    {row.offTrack}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
      </CardContent>
    </Card>
  )
}
