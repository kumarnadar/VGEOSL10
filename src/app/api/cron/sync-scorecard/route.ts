// src/app/api/cron/sync-scorecard/route.ts
//
// GET /api/cron/sync-scorecard
// Invoked by Vercel Cron (every Saturday 06:00 UTC).
// Syncs Zoho CRM data into scorecard_entries for all groups with show_zoho_crm = true.
//
// Security: requires Authorization: Bearer <CRON_SECRET> header (set in Vercel env).

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { syncZohoToScorecard } from '@/lib/zoho-sync'

// Day-name -> getDay() index mapping
const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

/** Calculate the most recent completed week_ending date for a given target day. */
function lastCompletedWeekEnding(targetDay: number): string {
  const now = new Date()
  const today = now.getUTCDay()
  let daysBack = (today - targetDay + 7) % 7
  // If today IS the target day, use last week's occurrence so data is complete
  if (daysBack === 0) daysBack = 7
  const last = new Date(now)
  last.setUTCDate(now.getUTCDate() - daysBack)
  return last.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Verify CRON_SECRET
  // ------------------------------------------------------------------
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ------------------------------------------------------------------
  // 2. Create service-role Supabase client (no cookie context for cron)
  // ------------------------------------------------------------------
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ------------------------------------------------------------------
  // 3. Find all groups with Zoho CRM enabled
  // ------------------------------------------------------------------
  const { data: groups, error: groupsErr } = await supabase
    .from('groups')
    .select('id, meeting_day')
    .eq('show_zoho_crm', true)

  if (groupsErr) {
    console.error('[cron/sync-scorecard] Failed to load groups:', groupsErr.message)
    return NextResponse.json({ error: groupsErr.message }, { status: 500 })
  }

  if (!groups?.length) {
    return NextResponse.json({ message: 'No groups with Zoho CRM enabled', results: [] })
  }

  // ------------------------------------------------------------------
  // 4. Sync each group
  // ------------------------------------------------------------------
  const results: {
    groupId: string
    weekEnding: string
    weeksProcessed: number
    entriesUpserted: number
    unmappedZohoUsers: string[]
    error?: string
  }[] = []

  for (const group of groups) {
    // Determine week_ending_day from scorecard_settings (default: friday)
    const { data: settingsRows } = await supabase
      .from('scorecard_settings')
      .select('setting_value')
      .eq('group_id', group.id)
      .eq('setting_key', 'week_ending_day')

    const weekEndingDayName = (settingsRows?.[0]?.setting_value || 'friday').toLowerCase()
    const targetDay = DAY_MAP[weekEndingDayName] ?? 5 // default Friday
    const weekEnding = lastCompletedWeekEnding(targetDay)

    try {
      const result = await syncZohoToScorecard(supabase, group.id, weekEnding, 1)
      results.push({
        groupId: group.id,
        weekEnding,
        ...result,
      })
    } catch (err: any) {
      console.error(`[cron/sync-scorecard] Group ${group.id} failed:`, err.message)
      results.push({
        groupId: group.id,
        weekEnding,
        weeksProcessed: 0,
        entriesUpserted: 0,
        unmappedZohoUsers: [],
        error: err.message,
      })
    }
  }

  return NextResponse.json({ success: true, results })
}
