'use client'

import { Button } from '@/components/ui/button'

interface WeekNavigatorProps {
  weekDates: { week_date: string; is_current: boolean }[]
  currentIndex: number
  onChange: (index: number) => void
  onStartNewWeek: () => void
  isCurrentWeek: boolean
}

export function WeekNavigator({ weekDates, currentIndex, onChange, onStartNewWeek, isCurrentWeek }: WeekNavigatorProps) {
  const currentWeek = weekDates[currentIndex]

  function formatWeekLabel(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00')
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(currentIndex + 1)}
        disabled={currentIndex >= weekDates.length - 1}
      >
        ←
      </Button>
      <span className="text-sm font-medium min-w-[200px] text-center">
        {currentWeek ? formatWeekLabel(currentWeek.week_date) : 'No weeks yet'}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(currentIndex - 1)}
        disabled={currentIndex <= 0}
      >
        →
      </Button>
      {isCurrentWeek && (
        <Button size="sm" variant="outline" onClick={onStartNewWeek}>
          Start New Week
        </Button>
      )}
    </div>
  )
}
