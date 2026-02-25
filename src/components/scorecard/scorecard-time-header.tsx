'use client'

import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getWeekEndingsForMonth, getCurrentQuarterLabel } from '@/lib/scorecard-utils'

interface ScorecardTimeHeaderProps {
  weekEndingDay?: string
  onWeekEndingsChange: (weekEndings: string[]) => void
  onQuarterChange?: (quarter: string) => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function ScorecardTimeHeader({
  weekEndingDay = 'friday',
  onWeekEndingsChange,
  onQuarterChange,
}: ScorecardTimeHeaderProps) {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())

  // Generate available years (current year and 2 prior)
  const years = useMemo(() => {
    const curr = now.getFullYear()
    return [curr, curr - 1, curr - 2]
  }, [])

  // Calculate week endings for selected month
  const weekEndings = useMemo(() => {
    const weeks = getWeekEndingsForMonth(selectedYear, selectedMonth, weekEndingDay)
    onWeekEndingsChange(weeks)
    return weeks
  }, [selectedYear, selectedMonth, weekEndingDay])

  // Determine quarter label
  const quarterLabel = useMemo(() => {
    const q = Math.ceil((selectedMonth + 1) / 3)
    return `${selectedYear}-Q${q}`
  }, [selectedYear, selectedMonth])

  const handleYearChange = (year: string) => {
    setSelectedYear(parseInt(year))
  }

  const handleMonthChange = (month: string) => {
    setSelectedMonth(parseInt(month))
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={String(selectedYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, idx) => (
            <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm text-muted-foreground">
        {quarterLabel} &middot; {weekEndings.length} weeks
      </span>
    </div>
  )
}
