'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle } from 'lucide-react'

interface EntryStatusBadgeProps {
  userName: string
  hasUpdated: boolean
}

export function EntryStatusBadge({ userName, hasUpdated }: EntryStatusBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {hasUpdated ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
      )}
      <span className={cn(!hasUpdated && 'text-muted-foreground')}>{userName}</span>
    </div>
  )
}
