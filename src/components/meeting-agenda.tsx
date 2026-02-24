'use client'

import { cn } from '@/lib/utils'

const AGENDA_STEPS = [
  { id: 'checkins', label: 'Check-ins', description: 'Personal & professional highlights' },
  { id: 'scorecard', label: 'Scorecard', description: 'Review key metrics' },
  { id: 'rocks', label: 'Rock Review', description: 'On track / off track status' },
  { id: 'focus', label: 'Top 10 Review', description: 'Focus tracker review' },
  { id: 'issues', label: 'Issues (IDS)', description: 'Identify, Discuss, Solve' },
  { id: 'conclude', label: 'Conclude & Score', description: 'Recap to-dos and rate meeting' },
]

interface MeetingAgendaProps {
  activeStep: string
  onStepChange: (stepId: string) => void
}

export function MeetingAgenda({ activeStep, onStepChange }: MeetingAgendaProps) {
  return (
    <nav className="space-y-1">
      {AGENDA_STEPS.map((step, index) => (
        <button
          key={step.id}
          onClick={() => onStepChange(step.id)}
          className={cn(
            'w-full text-left rounded-md px-3 py-2 text-sm transition-colors',
            activeStep === step.id
              ? 'bg-accent font-medium'
              : 'hover:bg-accent'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs">
              {index + 1}
            </span>
            <div>
              <p className="font-medium">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        </button>
      ))}
    </nav>
  )
}

export { AGENDA_STEPS }
