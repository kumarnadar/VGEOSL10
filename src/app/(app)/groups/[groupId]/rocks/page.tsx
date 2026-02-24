'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { useUser } from '@/hooks/use-user'
import { useRocks, useQuarters } from '@/hooks/use-rocks'
import { QuarterSelector } from '@/components/quarter-selector'
import { RockCard } from '@/components/rock-card'
import { CreateRockDialog } from '@/components/create-rock-dialog'
import { CardSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/empty-state'
import { FilterChip } from '@/components/filter-chip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ViewToggle } from '@/components/view-toggle'
import { useViewPreference } from '@/hooks/use-view-preference'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSkeleton } from '@/components/page-skeleton'

export default function RocksPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()

  const { data: groupMembers } = useSWR(
    `group-members-${groupId}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('group_members')
        .select('user_id, profiles!user_id(id, full_name)')
        .eq('group_id', groupId)
      return data || []
    }
  )

  const initialStatus = searchParams.get('status')
  const initialOwner = searchParams.get('owner')
  const [statusFilter, setStatusFilter] = useState<string | null>(initialStatus)
  const [ownerFilter, setOwnerFilter] = useState<string | null>(initialOwner || 'self')
  // Resolve 'self' to actual user ID once user loads
  useEffect(() => {
    if (ownerFilter === 'self' && user?.id) {
      setOwnerFilter(user.id)
    }
  }, [user, ownerFilter])
  const { data: quarters } = useQuarters()
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)

  // Default to current quarter
  useEffect(() => {
    if (quarters && !selectedQuarter) {
      const current = quarters.find((q: any) => q.is_current)
      if (current) setSelectedQuarter(current.id)
      else if (quarters.length > 0) setSelectedQuarter(quarters[0].id)
    }
  }, [quarters, selectedQuarter])

  const { data: rocks, isLoading } = useRocks(groupId, selectedQuarter)
  const [viewMode, setViewMode] = useViewPreference('eos-rocks-view', 'card')

  const filteredRocks = rocks?.filter((rock: any) => {
    if (statusFilter && rock.status !== statusFilter) return false
    if (ownerFilter && rock.owner?.id !== ownerFilter) return false
    return true
  })

  const currentQuarter = quarters?.find((q: any) => q.id === selectedQuarter)
  const isCurrentQuarter = currentQuarter?.is_current ?? false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Rocks</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ViewToggle view={viewMode} onChange={setViewMode} />
          <Select
            value={ownerFilter || 'all'}
            onValueChange={(v) => setOwnerFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-36 sm:w-44">
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {groupMembers?.map((gm: any) => (
                <SelectItem key={(gm.profiles as any)?.id} value={(gm.profiles as any)?.id}>
                  {(gm.profiles as any)?.full_name}
                  {(gm.profiles as any)?.id === user?.id ? ' (Me)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCurrentQuarter && <CreateRockDialog groupId={groupId} />}
          <QuarterSelector value={selectedQuarter} onChange={setSelectedQuarter} />
        </div>
      </div>

      {!isCurrentQuarter && selectedQuarter && (
        <p className="text-sm text-muted-foreground">Viewing historical quarter (read-only)</p>
      )}

      {statusFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <FilterChip
            label="Status"
            value={statusFilter === 'on_track' ? 'On Track' : 'Off Track'}
            onClear={() => {
              setStatusFilter(null)
              router.replace(`/groups/${groupId}/rocks`)
            }}
          />
        </div>
      )}

      {isLoading ? (
        viewMode === 'card' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-stagger">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <TableSkeleton rows={5} />
        )
      ) : filteredRocks?.length === 0 ? (
        (statusFilter || ownerFilter) ? (
          <EmptyState
            icon={<Target className="h-7 w-7" />}
            title="No matching rocks"
            description="No rocks match the current filters. Clear filters to see all rocks."
            action={{ label: 'Clear Filters', onClick: () => { setStatusFilter(null); setOwnerFilter(user?.id || null); router.replace(`/groups/${groupId}/rocks`) } }}
          />
        ) : (
          <EmptyState
            icon={<Target className="h-7 w-7" />}
            title="No rocks yet"
            description="Create your first rock to start tracking quarterly priorities for this group."
          />
        )
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {filteredRocks?.map((rock: any) => (
            <RockCard
              key={rock.id}
              rock={rock}
              groupId={groupId}
              readOnly={!isCurrentQuarter}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Milestones</TableHead>
                <TableHead>Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRocks?.map((rock: any) => {
                const total = rock.milestones?.length || 0
                const done = rock.milestones?.filter((m: any) => m.status === 'done').length || 0
                return (
                  <TableRow
                    key={rock.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/groups/${groupId}/rocks/${rock.id}`)}
                  >
                    <TableCell className="font-medium">
                      {rock.title}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {rock.owner?.full_name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={rock.status === 'on_track'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'}
                      >
                        {rock.status === 'on_track' ? 'On Track' : 'Off Track'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {total > 0 ? `${done}/${total}` : '-'}
                    </TableCell>
                    <TableCell>
                      {rock.completion === 'in_progress' ? '-' :
                       rock.completion === 'done' ? 'Done' :
                       rock.completion === 'not_done' ? 'Not Done' : 'Rolled Forward'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
