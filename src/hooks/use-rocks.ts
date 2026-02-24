'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

export function useRocks(groupId: string, quarterId: string | null) {
  const supabase = createClient()

  return useSWR(
    quarterId ? `rocks-${groupId}-${quarterId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('rocks')
        .select('*, owner:profiles!owner_id(id, full_name, email), milestones(id, status)')
        .eq('group_id', groupId)
        .eq('quarter_id', quarterId!)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    { refreshInterval: 30000 }
  )
}

export function useQuarters() {
  const supabase = createClient()

  return useSWR('quarters', async () => {
    const { data, error } = await supabase
      .from('quarters')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) throw error
    return data
  })
}
