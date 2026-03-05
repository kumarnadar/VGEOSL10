/**
 * Utility functions for scorecard week calculations and formatting.
 */

/** Get the week-ending date (default Friday) for a given date */
export function getWeekEnding(date: Date, weekEndingDay: string = 'friday'): Date {
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  }
  const targetDay = dayMap[weekEndingDay.toLowerCase()] ?? 5
  const d = new Date(date)
  const currentDay = d.getDay()
  const diff = (targetDay - currentDay + 7) % 7
  d.setDate(d.getDate() + diff)
  return d
}

/** Get all week-ending dates for a given month */
export function getWeekEndingsForMonth(
  year: number,
  month: number, // 0-indexed
  weekEndingDay: string = 'friday'
): string[] {
  const weeks: string[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let current = getWeekEnding(firstDay, weekEndingDay)
  // If the week ending is before the 1st, move to next week
  if (current < firstDay) {
    current.setDate(current.getDate() + 7)
  }

  while (current <= lastDay) {
    weeks.push(formatDate(current))
    current = new Date(current)
    current.setDate(current.getDate() + 7)
  }

  // Also include the last week ending that covers days in this month
  // even if the week-ending date falls in the next month
  const lastWeekEnd = getWeekEnding(lastDay, weekEndingDay)
  const lastFormatted = formatDate(lastWeekEnd)
  if (!weeks.includes(lastFormatted)) {
    weeks.push(lastFormatted)
  }

  return weeks
}

/** Format a date to YYYY-MM-DD string */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Format a week-ending date for column header (e.g., "Feb 7") */
export function formatWeekHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Format a number for display based on data type */
export function formatValue(value: number | null | undefined, dataType: string): string {
  if (value == null) return ''
  switch (dataType) {
    case 'currency':
      return value >= 1000
        ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
        : `$${value.toLocaleString()}`
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`
    case 'decimal':
      return value.toFixed(2)
    default:
      return value.toLocaleString()
  }
}

/** Format a full currency value (no abbreviation) */
export function formatCurrencyFull(value: number | null | undefined): string {
  if (value == null) return ''
  return `$${value.toLocaleString()}`
}

/** Parse a display value back to a number */
export function parseInputValue(input: string, dataType: string): number | null {
  const cleaned = input.replace(/[$,%\s]/g, '')
  if (cleaned === '') return null
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  if (dataType === 'percentage') return num / 100
  return num
}

/** Get the current quarter label (e.g., "2026-Q1") */
export function getCurrentQuarterLabel(): string {
  const now = new Date()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${quarter}`
}

/** Calculate % to goal */
export function percentToGoal(total: number, goal: number): number {
  if (goal === 0) return 0
  return total / goal
}

/** Get the color variant for a % to goal value based on configurable thresholds */
export function goalColorVariant(
  pct: number,
  thresholdGreen: number = 90,
  thresholdYellow: number = 50,
): 'success' | 'warning' | 'danger' {
  if (pct * 100 >= thresholdGreen) return 'success'
  if (pct * 100 >= thresholdYellow) return 'warning'
  return 'danger'
}

/** Get all week-ending dates for a quarter */
export function getWeekEndingsForQuarter(
  quarter: string,
  weekEndingDay: string = 'friday',
): string[] {
  const [yearStr, qPart] = quarter.split('-Q')
  const year = parseInt(yearStr)
  const q = parseInt(qPart)
  const startMonth = (q - 1) * 3 // 0-indexed
  const weeks: string[] = []
  for (let m = 0; m < 3; m++) {
    weeks.push(...getWeekEndingsForMonth(year, startMonth + m, weekEndingDay))
  }
  // Deduplicate (month boundaries can overlap)
  return [...new Set(weeks)].sort()
}

/** Determine the current week-ending date */
export function getCurrentWeekEnding(weekEndingDay: string = 'friday'): string {
  const now = new Date()
  const we = getWeekEnding(now, weekEndingDay)
  return formatDate(we)
}
