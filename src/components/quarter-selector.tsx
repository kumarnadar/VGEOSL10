'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuarters } from '@/hooks/use-rocks'

interface QuarterSelectorProps {
  value: string | null
  onChange: (quarterId: string) => void
}

export function QuarterSelector({ value, onChange }: QuarterSelectorProps) {
  const { data: quarters, isLoading } = useQuarters()

  if (isLoading || !quarters) return null

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-36 sm:w-48">
        <SelectValue placeholder="Select quarter" />
      </SelectTrigger>
      <SelectContent>
        {quarters.map((q: any) => (
          <SelectItem key={q.id} value={q.id}>
            {q.label} {q.is_current ? '(Current)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
