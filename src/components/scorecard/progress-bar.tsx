'use client'

import { cn } from '@/lib/utils'
import { formatValue } from '@/lib/scorecard-utils'

interface ProgressBarProps {
  label: string
  actual: number
  goal: number
  dataType: string
}

export function ProgressBar({ label, actual, goal, dataType }: ProgressBarProps) {
  const pct = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0
  const overGoal = goal > 0 && actual > goal

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate">{label}</span>
        <span className="text-muted-foreground shrink-0 ml-2">
          {formatValue(actual, dataType)} / {formatValue(goal, dataType)}
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            overGoal ? 'bg-green-500' :
            pct >= 70 ? 'bg-green-500' :
            pct >= 40 ? 'bg-yellow-500' :
            'bg-red-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{pct.toFixed(0)}% of goal</span>
        {overGoal && <span className="text-green-600 font-medium">Goal exceeded</span>}
      </div>
    </div>
  )
}
