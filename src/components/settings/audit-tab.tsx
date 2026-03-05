'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, CalendarDays, Clock } from 'lucide-react'

const PAGE_SIZE = 25

type DateRange = '7' | '30' | '90' | 'all'

interface AuditLogin {
  id: string
  user_id: string
  login_at: string
  ip_address: string | null
  user_agent: string | null
  profiles: { full_name: string | null } | null
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatLoginTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function parseDevice(userAgent: string | null): string {
  if (!userAgent) return '-'
  // Simplified browser/OS detection
  let browser = 'Unknown'
  let os = 'Unknown'

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('OPR')) {
    browser = 'Chrome'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari'
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox'
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge'
  } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    browser = 'Opera'
  }

  if (userAgent.includes('Windows')) {
    os = 'Windows'
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS'
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS'
  } else if (userAgent.includes('Android')) {
    os = 'Android'
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  }

  if (browser === 'Unknown' && os === 'Unknown') {
    return userAgent.slice(0, 60)
  }
  return `${browser} / ${os}`
}

interface SummaryStats {
  loginCount: number
  uniqueUsers: number
}

function computeStats(records: AuditLogin[], from: Date): SummaryStats {
  const filtered = records.filter((r) => new Date(r.login_at) >= from)
  const uniqueUserIds = new Set(filtered.map((r) => r.user_id))
  return { loginCount: filtered.length, uniqueUsers: uniqueUserIds.size }
}

export function AuditTab() {
  const supabase = createClient()

  // Summary data: last 30 days, computed client-side for all 3 timeframes
  const { data: summaryRecords, isLoading: summaryLoading } = useSWR(
    'audit-summary',
    async () => {
      const since = daysAgo(30).toISOString()
      const { data, error } = await supabase
        .from('audit_logins')
        .select('id, user_id, login_at')
        .gte('login_at', since)
        .order('login_at', { ascending: false })
      if (error) throw error
      return (data || []) as Pick<AuditLogin, 'id' | 'user_id' | 'login_at'>[]
    }
  )

  const todayStats = useMemo(
    () => computeStats((summaryRecords as AuditLogin[]) || [], startOfDay(new Date())),
    [summaryRecords]
  )
  const weekStats = useMemo(
    () => computeStats((summaryRecords as AuditLogin[]) || [], daysAgo(7)),
    [summaryRecords]
  )
  const monthStats = useMemo(
    () => computeStats((summaryRecords as AuditLogin[]) || [], daysAgo(30)),
    [summaryRecords]
  )

  // Filters
  const [userFilter, setUserFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>('30')
  const [page, setPage] = useState(0)

  const offset = page * PAGE_SIZE

  // Table data fetch
  const tableKey = `audit-table-${userFilter}-${dateRange}-${page}`
  const { data: tableData, isLoading: tableLoading } = useSWR(
    tableKey,
    async () => {
      let query = supabase
        .from('audit_logins')
        .select('*, profiles!audit_logins_user_id_fkey(full_name)')
        .order('login_at', { ascending: false })

      if (dateRange !== 'all') {
        const since = daysAgo(parseInt(dateRange)).toISOString()
        query = query.gte('login_at', since)
      }

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter)
      }

      query = query.range(offset, offset + PAGE_SIZE - 1)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as AuditLogin[]
    }
  )

  // Fetch distinct users for the user filter dropdown
  const { data: distinctUsers } = useSWR('audit-distinct-users', async () => {
    const { data, error } = await supabase
      .from('audit_logins')
      .select('user_id, profiles!audit_logins_user_id_fkey(full_name)')
      .order('user_id')
    if (error) throw error
    const seen = new Set<string>()
    const users: { userId: string; fullName: string }[] = []
    for (const row of (data || []) as any[]) {
      if (!seen.has(row.user_id)) {
        seen.add(row.user_id)
        users.push({
          userId: row.user_id,
          fullName: row.profiles?.full_name || row.user_id,
        })
      }
    }
    return users
  })

  function handleUserFilter(value: string) {
    setUserFilter(value)
    setPage(0)
  }

  function handleDateRange(value: DateRange) {
    setDateRange(value)
    setPage(0)
  }

  const hasNextPage = (tableData?.length ?? 0) === PAGE_SIZE
  const hasPrevPage = page > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Login activity across all users.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-8 w-24 rounded bg-muted animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{todayStats.loginCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {todayStats.uniqueUsers} unique user{todayStats.uniqueUsers !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-8 w-24 rounded bg-muted animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{weekStats.loginCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {weekStats.uniqueUsers} unique user{weekStats.uniqueUsers !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-8 w-24 rounded bg-muted animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{monthStats.loginCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {monthStats.uniqueUsers} unique user{monthStats.uniqueUsers !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={userFilter} onValueChange={handleUserFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {(distinctUsers || []).map((u) => (
              <SelectItem key={u.userId} value={u.userId}>
                {u.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(v) => handleDateRange(v as DateRange)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        {(userFilter !== 'all' || dateRange !== '30') && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => { handleUserFilter('all'); handleDateRange('30') }}>
            Clear filters
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Login Time</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Device</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (tableData?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No login records found.
                </TableCell>
              </TableRow>
            ) : (
              tableData?.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {row.profiles?.full_name || row.user_id}
                  </TableCell>
                  <TableCell>{formatLoginTime(row.login_at)}</TableCell>
                  <TableCell>{row.ip_address || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {parseDevice(row.user_agent)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} &mdash; showing up to {PAGE_SIZE} records
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={!hasPrevPage || tableLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage || tableLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
