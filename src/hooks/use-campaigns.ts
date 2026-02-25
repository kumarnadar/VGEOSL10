'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

export function useCampaigns(groupId: string) {
  const supabase = createClient()

  return useSWR(
    groupId ? `campaigns-${groupId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    { refreshInterval: 30000 }
  )
}

export function useCampaignData(campaignId: string | null, weekEndings: string[]) {
  const supabase = createClient()

  return useSWR(
    campaignId && weekEndings.length > 0
      ? `campaign-data-${campaignId}-${weekEndings.join(',')}`
      : null,
    async () => {
      const { data, error } = await supabase
        .from('campaign_weekly_data')
        .select('*, entered_by_user:profiles!campaign_weekly_data_entered_by_fkey(id, full_name)')
        .eq('campaign_id', campaignId!)
        .in('week_ending', weekEndings)
        .order('week_ending')

      if (error) throw error
      return data || []
    },
    { refreshInterval: 30000 }
  )
}

export function useCampaignMetrics(groupId: string) {
  const supabase = createClient()

  return useSWR(
    groupId ? `campaign-metrics-${groupId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('campaign_metric_definitions')
        .select('*')
        .eq('group_id', groupId)
        .order('display_order')

      if (error) throw error
      return data || []
    },
    { refreshInterval: 60000 }
  )
}
