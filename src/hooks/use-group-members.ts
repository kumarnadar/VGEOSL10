'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

export function useGroupMembers(groupId: string) {
  const supabase = createClient()

  return useSWR(
    groupId ? `group-members-${groupId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id, role_in_group, user:profiles!group_members_user_id_fkey(id, full_name)')
        .eq('group_id', groupId)
        .order('created_at')

      if (error) throw error
      return data || []
    },
    { refreshInterval: 60000 }
  )
}
