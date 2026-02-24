'use client'

import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ViewMode = 'card' | 'table'

interface ViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-md border">
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 px-2 rounded-r-none ${view === 'card' ? 'bg-muted' : ''}`}
        onClick={() => onChange('card')}
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 px-2 rounded-l-none ${view === 'table' ? 'bg-muted' : ''}`}
        onClick={() => onChange('table')}
        aria-label="Table view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
