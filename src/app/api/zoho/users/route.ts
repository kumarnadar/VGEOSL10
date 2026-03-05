// src/app/api/zoho/users/route.ts
// GET /api/zoho/users
// Returns distinct Zoho CRM users extracted from recent Deals and Contacts.
// Uses modules scope (ZohoCRM.modules.ALL) -- does NOT require ZohoCRM.users.READ.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { searchRecords, ZohoRecord } from '@/lib/zoho'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Fetch recent Deals (last 90 days) to extract unique Owner/Created_By users
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const startDate = `${ninetyDaysAgo.toISOString().slice(0, 10)}T00:00:00+00:00`
    const endDate = `${new Date().toISOString().slice(0, 10)}T23:59:59+00:00`

    const deals = await searchRecords(
      'Deals',
      'Deal_Name,Owner,Created_By',
      `(Created_Time:between:${startDate},${endDate})`
    ).catch(() => [] as ZohoRecord[])

    // Extract unique users from Owner and Created_By fields
    const userMap = new Map<string, { id: string; name: string }>()

    for (const record of deals) {
      for (const field of ['Owner', 'Created_By']) {
        const u = record[field] as { id?: string; name?: string } | null
        if (u?.id && u?.name && !userMap.has(u.id)) {
          userMap.set(u.id, { id: u.id, name: u.name })
        }
      }
    }

    // Also check Contacts for users who might only create contacts
    const contacts = await searchRecords(
      'Contacts',
      'Full_Name,Created_By',
      `(Created_Time:between:${startDate},${endDate})`
    ).catch(() => [] as ZohoRecord[])

    for (const record of contacts) {
      const u = record.Created_By as { id?: string; name?: string } | null
      if (u?.id && u?.name && !userMap.has(u.id)) {
        userMap.set(u.id, { id: u.id, name: u.name })
      }
    }

    const users = Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ users })
  } catch (err: any) {
    console.error('[zoho/users]', err.message)
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
