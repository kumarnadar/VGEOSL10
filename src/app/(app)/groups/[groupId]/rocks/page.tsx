'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useRocks, useQuarters } from '@/hooks/use-rocks'
import { QuarterSelector } from '@/components/quarter-selector'
import { RockCard } from '@/components/rock-card'
import { CreateRockDialog } from '@/components/create-rock-dialog'

export default function RocksPage() {
  const params = useParams()
  const groupId = params.groupId as string
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

  const currentQuarter = quarters?.find((q: any) => q.id === selectedQuarter)
  const isCurrentQuarter = currentQuarter?.is_current ?? false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rocks</h1>
        <div className="flex items-center gap-2">
          {isCurrentQuarter && <CreateRockDialog groupId={groupId} />}
          <QuarterSelector value={selectedQuarter} onChange={setSelectedQuarter} />
        </div>
      </div>

      {!isCurrentQuarter && selectedQuarter && (
        <p className="text-sm text-muted-foreground">Viewing historical quarter (read-only)</p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading rocks...</p>
      ) : rocks?.length === 0 ? (
        <p className="text-muted-foreground">No rocks for this quarter yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rocks?.map((rock: any) => (
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
