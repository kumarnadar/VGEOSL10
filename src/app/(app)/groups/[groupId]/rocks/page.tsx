'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Target } from 'lucide-react'
import { useRocks, useQuarters } from '@/hooks/use-rocks'
import { QuarterSelector } from '@/components/quarter-selector'
import { RockCard } from '@/components/rock-card'
import { CreateRockDialog } from '@/components/create-rock-dialog'
import { CardSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/empty-state'
import { FilterChip } from '@/components/filter-chip'

export default function RocksPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialStatus = searchParams.get('status')
  const initialOwner = searchParams.get('owner')
  const [statusFilter, setStatusFilter] = useState<string | null>(initialStatus)
  const [ownerFilter, setOwnerFilter] = useState<string | null>(initialOwner)
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

  const filteredRocks = rocks?.filter((rock: any) => {
    if (statusFilter && rock.status !== statusFilter) return false
    if (ownerFilter && rock.owner?.id !== ownerFilter) return false
    return true
  })

  const currentQuarter = quarters?.find((q: any) => q.id === selectedQuarter)
  const isCurrentQuarter = currentQuarter?.is_current ?? false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Rocks</h1>
        </div>
        <div className="flex items-center gap-2">
          {isCurrentQuarter && <CreateRockDialog groupId={groupId} />}
          <QuarterSelector value={selectedQuarter} onChange={setSelectedQuarter} />
        </div>
      </div>

      {!isCurrentQuarter && selectedQuarter && (
        <p className="text-sm text-muted-foreground">Viewing historical quarter (read-only)</p>
      )}

      {(statusFilter || ownerFilter) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          {statusFilter && (
            <FilterChip
              label="Status"
              value={statusFilter === 'on_track' ? 'On Track' : 'Off Track'}
              onClear={() => {
                setStatusFilter(null)
                router.replace(`/groups/${groupId}/rocks`)
              }}
            />
          )}
          {ownerFilter && (
            <FilterChip
              label="Owner"
              value={rocks?.find((r: any) => r.owner?.id === ownerFilter)?.owner?.full_name || 'Unknown'}
              onClear={() => {
                setOwnerFilter(null)
                router.replace(`/groups/${groupId}/rocks`)
              }}
            />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-stagger">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredRocks?.length === 0 ? (
        (statusFilter || ownerFilter) ? (
          <EmptyState
            icon={<Target className="h-7 w-7" />}
            title="No matching rocks"
            description="No rocks match the current filters. Clear filters to see all rocks."
            action={{ label: 'Clear Filters', onClick: () => { setStatusFilter(null); setOwnerFilter(null); router.replace(`/groups/${groupId}/rocks`) } }}
          />
        ) : (
          <EmptyState
            icon={<Target className="h-7 w-7" />}
            title="No rocks yet"
            description="Create your first rock to start tracking quarterly priorities for this group."
          />
        )
      ) : (
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
      )}
    </div>
  )
}
