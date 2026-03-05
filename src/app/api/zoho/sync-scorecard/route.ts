// src/app/api/zoho/sync-scorecard/route.ts
//
// POST /api/zoho/sync-scorecard
// Admin-only endpoint to pull Zoho CRM data into scorecard_entries.
//
// Body: { groupId: string, weekEnding: string, weeks?: number }
//   groupId   - UUID of the group to sync
//   weekEnding - ISO date (YYYY-MM-DD) of the most recent week to sync
//   weeks      - how many consecutive weeks to sync going backwards (default 1, max 52)
//
// Returns: { success: true, weeksProcessed, entriesUpserted, unmappedZohoUsers }

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { syncZohoToScorecard } from '@/lib/zoho-sync'

export async function POST(request: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Auth: verify caller is system_admin
  // ------------------------------------------------------------------
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in API route */ },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)

  if (profileErr || !profiles?.length || profiles[0].role !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden: system_admin role required' }, { status: 403 })
  }

  // ------------------------------------------------------------------
  // 2. Parse and validate request body
  // ------------------------------------------------------------------
  let body: { groupId?: string; weekEnding?: string; weeks?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { groupId, weekEnding, weeks = 1 } = body

  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Missing required field: groupId' }, { status: 400 })
  }

  if (!weekEnding || typeof weekEnding !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) {
    return NextResponse.json(
      { error: 'Missing or invalid field: weekEnding (expected YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  const weeksNum = Math.min(Math.max(1, Number(weeks) || 1), 52)

  // ------------------------------------------------------------------
  // 3. Run sync
  // ------------------------------------------------------------------
  try {
    const result = await syncZohoToScorecard(supabase, groupId, weekEnding, weeksNum)

    return NextResponse.json({
      success: true,
      weeksProcessed: result.weeksProcessed,
      entriesUpserted: result.entriesUpserted,
      unmappedZohoUsers: result.unmappedZohoUsers,
    })
  } catch (err: any) {
    console.error('[sync-scorecard] Error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Sync failed' },
      { status: 500 },
    )
  }
}
