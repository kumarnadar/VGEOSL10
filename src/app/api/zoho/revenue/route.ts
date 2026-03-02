// src/app/api/zoho/revenue/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { zohoFetch } from '@/lib/zoho'

const CLOSED_WON = 'Closed Won'
const CLOSED_LOST = 'Closed Lost'

interface ZohoDeal {
  Amount: number | null
  Stage: string
  Closing_Date: string | null
  Created_Time: string
}

export async function GET() {
  // Authenticate caller via Supabase cookie
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in API route */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Fetch all deals (paginate if needed)
    const allDeals: ZohoDeal[] = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= 5) {
      const result = await zohoFetch(
        `/crm/v7/Deals?fields=Amount,Stage,Closing_Date,Created_Time&per_page=200&page=${page}`
      )
      if (result.data) {
        allDeals.push(...result.data)
      }
      hasMore = result.info?.more_records === true
      page++
    }

    // Separate pipeline vs won
    const pipeline = allDeals.filter(d => d.Stage !== CLOSED_WON && d.Stage !== CLOSED_LOST)
    const won = allDeals.filter(d => d.Stage === CLOSED_WON)

    const sum = (deals: ZohoDeal[]) => deals.reduce((s, d) => s + (d.Amount || 0), 0)

    // Weekly trend: group won deals by Closing_Date week (last 6 weeks)
    const now = new Date()
    const sixWeeksAgo = new Date(now)
    sixWeeksAgo.setDate(now.getDate() - 42)

    const weekBuckets: Record<string, { pipeline: number; won: number }> = {}

    // Initialize last 6 week buckets (Monday-based)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - (i * 7) - ((now.getDay() + 6) % 7))
      const key = d.toISOString().slice(0, 10)
      weekBuckets[key] = { pipeline: 0, won: 0 }
    }

    const weekKeys = Object.keys(weekBuckets).sort()

    function getWeekKey(dateStr: string | null): string | null {
      if (!dateStr) return null
      const date = new Date(dateStr + 'T00:00:00')
      if (date < sixWeeksAgo) return null
      // Find the Monday of the week
      const monday = new Date(date)
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
      const key = monday.toISOString().slice(0, 10)
      return weekKeys.includes(key) ? key : null
    }

    won.forEach(d => {
      const wk = getWeekKey(d.Closing_Date)
      if (wk && weekBuckets[wk]) weekBuckets[wk].won += (d.Amount || 0)
    })

    pipeline.forEach(d => {
      const wk = getWeekKey(d.Closing_Date)
      if (wk && weekBuckets[wk]) weekBuckets[wk].pipeline += (d.Amount || 0)
    })

    const weeklyTrend = weekKeys.map(key => ({
      week: new Date(key + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pipeline: weekBuckets[key].pipeline,
      won: weekBuckets[key].won,
    }))

    return NextResponse.json({
      pipeline: { count: pipeline.length, value: sum(pipeline) },
      won: { count: won.length, value: sum(won) },
      weeklyTrend,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Zoho API error:', err.message)
    return NextResponse.json(
      { error: 'Failed to fetch CRM data' },
      { status: 502 }
    )
  }
}
