'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

export function useFocusSnapshot(userId: string | null, groupId: string, weekDate: string | null) {
  const supabase = createClient()

  return useSWR(
    userId && weekDate ? `focus-${userId}-${groupId}-${weekDate}` : null,
    async () => {
      const { data: snapshot } = await supabase
        .from('focus_snapshots')
        .select('*, focus_items(*)')
        .eq('user_id', userId!)
        .eq('group_id', groupId)
        .eq('week_date', weekDate!)
        .single()

      return snapshot
    },
    { refreshInterval: 30000 }
  )
}

export function useGroupFocusSnapshots(groupId: string, weekDate: string | null) {
  const supabase = createClient()

  return useSWR(
    weekDate ? `group-focus-${groupId}-${weekDate}` : null,
    async () => {
      const { data } = await supabase
        .from('focus_snapshots')
        .select('*, user:profiles!user_id(id, full_name), focus_items(*)')
        .eq('group_id', groupId)
        .eq('week_date', weekDate!)
        .order('created_at')

      return data || []
    },
    { refreshInterval: 30000 }
  )
}

export function useWeekDates(userId: string | null, groupId: string) {
  const supabase = createClient()

  return useSWR(
    userId ? `week-dates-${userId}-${groupId}` : null,
    async () => {
      const { data } = await supabase
        .from('focus_snapshots')
        .select('week_date, is_current')
        .eq('user_id', userId!)
        .eq('group_id', groupId)
        .order('week_date', { ascending: false })

      return data || []
    }
  )
}
