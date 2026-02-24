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
  completedSteps?: string[]
}

export function MeetingAgenda({ activeStep, onStepChange, completedSteps = [] }: MeetingAgendaProps) {
  return (
    <nav className="space-y-0">
      {AGENDA_STEPS.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id)
        const isActive = activeStep === step.id

        return (
          <div key={step.id}>
            {index > 0 && (
              <div className="flex justify-start pl-[15px]">
                <div className={cn(
                  'w-0.5 h-3',
                  completedSteps.includes(AGENDA_STEPS[index - 1].id) ? 'bg-green-500' : 'bg-border'
                )} />
              </div>
            )}
            <button
              onClick={() => onStepChange(step.id)}
              className={cn(
                'w-full text-left rounded-md px-3 py-2 text-sm transition-all duration-200',
                isActive ? 'bg-primary/10' : 'hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-200',
                  isCompleted ? 'bg-green-500 text-white border-green-500' :
                  isActive ? 'bg-primary text-primary-foreground' :
                  'border bg-background text-muted-foreground'
                )}>
                  {isCompleted ? '\u2713' : index + 1}
                </span>
                <div>
                  <p className={cn(
                    'font-medium transition-colors',
                    isActive ? 'text-primary' : ''
                  )}>{step.label}</p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            </button>
          </div>
        )
      })}
    </nav>
  )
}

export { AGENDA_STEPS }
