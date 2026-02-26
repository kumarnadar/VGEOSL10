'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'

export interface UserPreferences {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  notification_channel: 'email' | 'sms' | 'both' | 'none'
  meeting_reminder_timing: '1_day' | '1_hour' | 'both' | 'none'
  scorecard_reminder_enabled: boolean
}

const DEFAULTS: Omit<UserPreferences, 'id' | 'user_id'> = {
  theme: 'system',
  notification_channel: 'email',
  meeting_reminder_timing: '1_day',
  scorecard_reminder_enabled: true,
}

export function useUserPreferences(userId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading } = useSWR(
    userId ? `user-preferences-${userId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId!)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      return (data as UserPreferences | null) ?? { ...DEFAULTS, user_id: userId!, id: '' }
    }
  )

  async function savePreferences(updates: Partial<Omit<UserPreferences, 'id' | 'user_id'>>) {
    if (!userId) return

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: userId, ...updates },
        { onConflict: 'user_id' }
      )

    if (error) throw error
    mutate(`user-preferences-${userId}`)
  }

  return {
    preferences: data ?? { ...DEFAULTS, user_id: userId ?? '', id: '' } as UserPreferences,
    error,
    isLoading,
    savePreferences,
  }
}
