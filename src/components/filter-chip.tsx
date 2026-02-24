'use client'

import { X } from 'lucide-react'

interface FilterChipProps {
  label: string
  value: string
  onClear: () => void
}

export function FilterChip({ label, value, onClear }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm animate-fade-in">
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        onClick={onClear}
        className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
        aria-label={`Clear ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
