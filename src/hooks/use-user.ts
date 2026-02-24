'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

export function useUser() {
  const supabase = createClient()

  const { data: user, error, isLoading } = useSWR('user', async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, group_members(group_id, role_in_group, groups(id, name))')
      .eq('id', user.id)
      .single()

    return profile
  })

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { user, error, isLoading, signOut }
}
