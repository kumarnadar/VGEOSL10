'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

export function useScorecardTemplate(groupId: string) {
  const supabase = createClient()

  return useSWR(
    groupId ? `scorecard-template-${groupId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('scorecard_templates')
        .select(`
          *,
          scorecard_sections(
            *,
            scorecard_measures(
              *,
              owner:profiles!scorecard_measures_owner_user_id_fkey(id, full_name)
            )
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .single()

      if (error) throw error

      // Sort sections and measures by display_order
      if (data?.scorecard_sections) {
        data.scorecard_sections.sort((a: any, b: any) => a.display_order - b.display_order)
        data.scorecard_sections.forEach((section: any) => {
          section.scorecard_measures?.sort((a: any, b: any) => a.display_order - b.display_order)
        })
      }

      return data
    },
    { refreshInterval: 60000 }
  )
}

export function useScorecardEntries(groupId: string, weekEndings: string[]) {
  const supabase = createClient()

  return useSWR(
    groupId && weekEndings.length > 0
      ? `scorecard-entries-${groupId}-${weekEndings.join(',')}`
      : null,
    async () => {
      // First get all measure IDs for this group's template
      const { data: template } = await supabase
        .from('scorecard_templates')
        .select('scorecard_sections(scorecard_measures(id))')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .single()

      if (!template) return []

      const measureIds = template.scorecard_sections
        ?.flatMap((s: any) => s.scorecard_measures?.map((m: any) => m.id) || []) || []

      if (measureIds.length === 0) return []

      const { data, error } = await supabase
        .from('scorecard_entries')
        .select('*, user:profiles!scorecard_entries_user_id_fkey(id, full_name)')
        .in('measure_id', measureIds)
        .in('week_ending', weekEndings)

      if (error) throw error
      return data || []
    },
    { refreshInterval: 30000 }
  )
}

export function useScorecardGoals(groupId: string, quarter: string) {
  const supabase = createClient()

  return useSWR(
    groupId && quarter ? `scorecard-goals-${groupId}-${quarter}` : null,
    async () => {
      // Get measure IDs for this group
      const { data: template } = await supabase
        .from('scorecard_templates')
        .select('scorecard_sections(scorecard_measures(id))')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .single()

      if (!template) return []

      const measureIds = template.scorecard_sections
        ?.flatMap((s: any) => s.scorecard_measures?.map((m: any) => m.id) || []) || []

      if (measureIds.length === 0) return []

      const { data, error } = await supabase
        .from('scorecard_goals')
        .select('*')
        .in('measure_id', measureIds)
        .eq('quarter', quarter)

      if (error) throw error
      return data || []
    },
    { refreshInterval: 60000 }
  )
}

export function useEntryDetails(entryId: string | null) {
  const supabase = createClient()

  return useSWR(
    entryId ? `entry-details-${entryId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('scorecard_entry_details')
        .select('*')
        .eq('entry_id', entryId!)
        .order('display_order')

      if (error) throw error
      return data || []
    },
    { refreshInterval: 30000 }
  )
}

export function useScorecardSettings(groupId: string) {
  const supabase = createClient()

  return useSWR(
    groupId ? `scorecard-settings-${groupId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('scorecard_settings')
        .select('*')
        .eq('group_id', groupId)

      if (error) throw error

      // Convert to key-value map
      const settings: Record<string, string> = {}
      data?.forEach((s: any) => {
        settings[s.setting_key] = s.setting_value
      })
      return settings
    },
    { refreshInterval: 60000 }
  )
}
