'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardCardProps {
  title: string
  value: string | number
  subtitle?: string
}

export function DashboardCard({ title, value, subtitle }: DashboardCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rocks by Group</CardTitle>
      </CardHeader>
      <CardContent>
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
              <tr key={row.groupName} className="border-b">
                <td className="py-2">{row.groupName}</td>
                <td className="text-right py-2">{row.total}</td>
                <td className="text-right py-2 text-green-600">{row.onTrack}</td>
                <td className="text-right py-2 text-red-600">{row.offTrack}</td>
                <td className="text-right py-2 font-medium">{row.pctOnTrack}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rocks by Person</CardTitle>
      </CardHeader>
      <CardContent>
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
              <tr key={row.personName} className="border-b">
                <td className="py-2">{row.personName}</td>
                <td className="text-right py-2">{row.total}</td>
                <td className="text-right py-2 text-green-600">{row.onTrack}</td>
                <td className="text-right py-2 text-red-600">{row.offTrack}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
      </CardContent>
    </Card>
  )
}
