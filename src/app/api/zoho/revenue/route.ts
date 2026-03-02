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

    const currentYear = new Date().getFullYear()

    // Pipeline: all open deals regardless of date
    const pipeline = allDeals.filter(d => d.Stage !== CLOSED_WON && d.Stage !== CLOSED_LOST)

    // Won: only Closed Won deals with Closing_Date in the current year
    const won = allDeals.filter(d => {
      if (d.Stage !== CLOSED_WON) return false
      if (!d.Closing_Date) return false
      return new Date(d.Closing_Date + 'T00:00:00').getFullYear() === currentYear
    })

    const sum = (deals: ZohoDeal[]) => deals.reduce((s, d) => s + (d.Amount || 0), 0)

    // Quarterly trend: Q1-Q4 for the current year, bucketed by Closing_Date month
    // Deals with null Closing_Date are excluded from the trend buckets
    function getQuarter(dateStr: string | null): 'Q1' | 'Q2' | 'Q3' | 'Q4' | null {
      if (!dateStr) return null
      const date = new Date(dateStr + 'T00:00:00')
      if (date.getFullYear() !== currentYear) return null
      const month = date.getMonth() // 0-based
      if (month <= 2) return 'Q1'
      if (month <= 5) return 'Q2'
      if (month <= 8) return 'Q3'
      return 'Q4'
    }

    const quarterBuckets: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', { pipeline: number; won: number }> = {
      Q1: { pipeline: 0, won: 0 },
      Q2: { pipeline: 0, won: 0 },
      Q3: { pipeline: 0, won: 0 },
      Q4: { pipeline: 0, won: 0 },
    }

    won.forEach(d => {
      const q = getQuarter(d.Closing_Date)
      if (q) quarterBuckets[q].won += (d.Amount || 0)
    })

    pipeline.forEach(d => {
      const q = getQuarter(d.Closing_Date)
      if (q) quarterBuckets[q].pipeline += (d.Amount || 0)
    })

    const quarterlyTrend = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => ({
      quarter: q,
      pipeline: quarterBuckets[q].pipeline,
      won: quarterBuckets[q].won,
    }))

    return NextResponse.json({
      pipeline: { count: pipeline.length, value: sum(pipeline) },
      won: { count: won.length, value: sum(won) },
      quarterlyTrend,
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
