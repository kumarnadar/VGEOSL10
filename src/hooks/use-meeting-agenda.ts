'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

export interface AgendaStep {
  id: string
  step_key: string
  label: string
  description: string | null
  display_order: number
  is_enabled: boolean
  time_box_minutes: number
}

// Hardcoded fallback matching the original AGENDA_STEPS constant
const DEFAULT_AGENDA_STEPS: Omit<AgendaStep, 'id'>[] = [
  { step_key: 'checkins', label: 'Check-ins', description: 'Personal & professional highlights', display_order: 1, is_enabled: true, time_box_minutes: 5 },
  { step_key: 'rocks', label: 'Rock Review', description: 'On track / off track status', display_order: 2, is_enabled: true, time_box_minutes: 15 },
  { step_key: 'scorecard', label: 'Scorecard', description: 'Review key metrics', display_order: 3, is_enabled: true, time_box_minutes: 10 },
  { step_key: 'focus', label: 'Top 10 Review', description: 'Focus tracker review', display_order: 4, is_enabled: true, time_box_minutes: 10 },
  { step_key: 'issues', label: 'Issues (IDS)', description: 'Identify, Discuss, Solve', display_order: 5, is_enabled: true, time_box_minutes: 60 },
  { step_key: 'conclude', label: 'Conclude & Score', description: 'Recap to-dos and rate meeting', display_order: 6, is_enabled: true, time_box_minutes: 5 },
]

export function useMeetingAgenda(groupId: string | null) {
  const supabase = createClient()

  return useSWR(
    groupId ? `meeting-agenda-${groupId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('meeting_agenda_config')
        .select('*')
        .eq('group_id', groupId!)
        .order('display_order')

      if (error) throw error

      // If no config exists for this group, return defaults
      if (!data || data.length === 0) {
        return DEFAULT_AGENDA_STEPS.map((s, i) => ({
          ...s,
          id: `default-${i}`,
        })) as AgendaStep[]
      }

      return data as AgendaStep[]
    },
    { refreshInterval: 60000 }
  )
}

export { DEFAULT_AGENDA_STEPS }
