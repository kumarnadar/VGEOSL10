'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AccentColor = 'blue' | 'green' | 'red' | 'amber' | 'purple'

interface DashboardCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  accent?: AccentColor
  progress?: number
  href?: string
  onClick?: () => void
}

const accentBorderMap: Record<AccentColor, string> = {
  blue: 'border-l-primary',
  green: 'border-l-green-500',
  red: 'border-l-destructive',
  amber: 'border-l-amber-500',
  purple: 'border-l-purple-500',
}

const accentProgressMap: Record<AccentColor, string> = {
  blue: 'bg-primary',
  green: 'bg-green-500',
  red: 'bg-destructive',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
}

export function DashboardCard({ title, value, subtitle, icon, accent, progress, href, onClick }: DashboardCardProps) {
  const borderClass = accent ? `border-l-4 ${accentBorderMap[accent]}` : ''
  const progressBarColor = accent ? accentProgressMap[accent] : 'bg-primary'
  const isClickable = !!(href || onClick)

  const cardContent = (
    <Card className={`card-hover animate-fade-in h-full ${borderClass} ${isClickable ? 'cursor-pointer group' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="flex items-center gap-1">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${isClickable ? 'group-hover:underline decoration-primary/30 underline-offset-4' : ''}`}>{value}</p>
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

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  if (onClick) {
    return <div onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>{cardContent}</div>
  }

  return cardContent
}

interface RocksByGroupRow {
  groupName: string
  groupId?: string
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
        <div className="table-striped overflow-x-auto">
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
                  <td className="py-2">
                    {row.groupId ? (
                      <Link href={`/groups/${row.groupId}/rocks`} className="hover:underline text-primary">
                        {row.groupName}
                      </Link>
                    ) : row.groupName}
                  </td>
                  <td className="text-right py-2">{row.total}</td>
                  <td className="text-right py-2 text-green-600 dark:text-green-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1" />
                    {row.groupId ? (
                      <Link href={`/groups/${row.groupId}/rocks?status=on_track`} className="hover:underline">
                        {row.onTrack}
                      </Link>
                    ) : row.onTrack}
                  </td>
                  <td className="text-right py-2 text-red-600 dark:text-red-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1" />
                    {row.groupId ? (
                      <Link href={`/groups/${row.groupId}/rocks?status=off_track`} className="hover:underline">
                        {row.offTrack}
                      </Link>
                    ) : row.offTrack}
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
  ownerId?: string
  groupId?: string
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
        <div className="table-striped overflow-x-auto">
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
                  <td className="py-2">
                    {row.groupId && row.ownerId ? (
                      <Link href={`/groups/${row.groupId}/rocks?owner=${row.ownerId}`} className="hover:underline text-primary">
                        {row.personName}
                      </Link>
                    ) : row.personName}
                  </td>
                  <td className="text-right py-2">{row.total}</td>
                  <td className="text-right py-2 text-green-600 dark:text-green-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1" />
                    {row.onTrack}
                  </td>
                  <td className="text-right py-2 text-red-600 dark:text-red-400">
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
