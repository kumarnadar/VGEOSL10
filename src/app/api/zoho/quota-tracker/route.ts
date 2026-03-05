// src/app/api/zoho/quota-tracker/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { zohoFetch } from '@/lib/zoho'

const CLOSED_WON = 'Closed Won'
const CLOSED_LOST = 'Closed Lost'

interface ZohoDeal {
  Deal_Name: string
  Amount: number | null
  Stage: string
  Closing_Date: string | null
  Owner: { name: string; id: string } | null
  Account_Name: { name: string } | string | null
}

interface DealSummary {
  name: string
  account: string
  amount: number
  stage: string
  closingDate: string
}

interface UserQuotaRow {
  user_id: string
  amount: number
}

interface ProfileRow {
  id: string
  full_name: string | null
  zoho_user_id: string | null
}

function getQuarterDateRange(quarter: number, year: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3
  const endMonth = startMonth + 2
  const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, endMonth + 1, 0).getDate()
  const end = `${year}-${String(endMonth + 1).padStart(2, '0')}-${lastDay}`
  return { start, end }
}

function currentQuarter(): number {
  const month = new Date().getMonth() // 0-indexed
  return Math.floor(month / 3) + 1
}

function mapDeal(d: ZohoDeal): DealSummary {
  return {
    name: d.Deal_Name || '',
    account:
      typeof d.Account_Name === 'object' && d.Account_Name !== null
        ? (d.Account_Name as { name: string }).name || ''
        : String(d.Account_Name || ''),
    amount: d.Amount || 0,
    stage: d.Stage,
    closingDate: d.Closing_Date || '',
  }
}

export async function GET(req: NextRequest) {
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

  // Parse query params
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const quarter = parseInt(searchParams.get('quarter') || String(currentQuarter()), 10)

  if (quarter < 1 || quarter > 4 || isNaN(year)) {
    return NextResponse.json({ error: 'Invalid quarter or year' }, { status: 400 })
  }

  try {
    const { start, end } = getQuarterDateRange(quarter, year)

    // --- Fetch all deals from Zoho (paginated) ---
    const allDeals: ZohoDeal[] = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= 10) {
      const result = await zohoFetch(
        `/crm/v7/Deals?fields=Deal_Name,Amount,Stage,Closing_Date,Owner,Account_Name&per_page=200&page=${page}`
      )
      if (result.data) {
        allDeals.push(...result.data)
      }
      hasMore = result.info?.more_records === true
      page++
    }

    // Filter deals by Closing_Date within the selected quarter
    const quarterDeals = allDeals.filter(d => {
      if (!d.Closing_Date) return false
      return d.Closing_Date >= start && d.Closing_Date <= end
    })

    // Split into pipeline (open) and won (Closed Won); exclude Closed Lost from pipeline
    const pipelineDeals = quarterDeals.filter(
      d => d.Stage !== CLOSED_WON && d.Stage !== CLOSED_LOST
    )
    const wonDeals = quarterDeals.filter(d => d.Stage === CLOSED_WON)

    // --- Fetch quotas and profiles from Supabase in parallel ---
    const [quotasResult, profilesResult] = await Promise.all([
      supabase
        .from('user_quotas')
        .select('user_id, amount')
        .eq('quarter', quarter)
        .eq('year', year),
      supabase
        .from('profiles')
        .select('id, full_name, zoho_user_id')
        .eq('is_active', true),
    ])

    const quotas: UserQuotaRow[] = quotasResult.data || []
    const profiles: ProfileRow[] = profilesResult.data || []

    // Build lookup: zoho_user_id -> quota amount
    const zohoUserIdToQuota = new Map<string, number>()
    for (const profile of profiles) {
      if (!profile.zoho_user_id) continue
      const quota = quotas.find(q => q.user_id === profile.id)
      if (quota) {
        zohoUserIdToQuota.set(profile.zoho_user_id, quota.amount)
      }
    }

    // Build lookup: zoho_user_id -> full_name (prefer Zoho deal owner name as fallback)
    const zohoUserIdToName = new Map<string, string>()
    for (const profile of profiles) {
      if (profile.zoho_user_id && profile.full_name) {
        zohoUserIdToName.set(profile.zoho_user_id, profile.full_name)
      }
    }

    // Group pipeline and won deals by Zoho owner id
    type UserAccumulator = {
      name: string
      zohoUserId: string
      pipelineDeals: DealSummary[]
      wonDeals: DealSummary[]
    }

    const byOwner = new Map<string, UserAccumulator>()

    function accumulateDeal(d: ZohoDeal, bucket: 'pipelineDeals' | 'wonDeals') {
      const zohoUserId = d.Owner?.id || ''
      const ownerName = d.Owner?.name || 'Unknown'
      if (!byOwner.has(zohoUserId)) {
        byOwner.set(zohoUserId, {
          name: zohoUserIdToName.get(zohoUserId) || ownerName,
          zohoUserId,
          pipelineDeals: [],
          wonDeals: [],
        })
      }
      byOwner.get(zohoUserId)![bucket].push(mapDeal(d))
    }

    for (const d of pipelineDeals) accumulateDeal(d, 'pipelineDeals')
    for (const d of wonDeals) accumulateDeal(d, 'wonDeals')

    // Add users who have a quota but zero deals (so they still appear in the tracker)
    for (const profile of profiles) {
      if (!profile.zoho_user_id) continue
      const hasQuota = zohoUserIdToQuota.has(profile.zoho_user_id)
      if (hasQuota && !byOwner.has(profile.zoho_user_id)) {
        byOwner.set(profile.zoho_user_id, {
          name: profile.full_name || profile.zoho_user_id,
          zohoUserId: profile.zoho_user_id,
          pipelineDeals: [],
          wonDeals: [],
        })
      }
    }

    // Merge quota data and build final response array
    const users = Array.from(byOwner.values()).map(u => {
      const quota = zohoUserIdToQuota.has(u.zohoUserId)
        ? zohoUserIdToQuota.get(u.zohoUserId)!
        : null
      const pipeline = u.pipelineDeals.reduce((s, d) => s + d.amount, 0)
      const won = u.wonDeals.reduce((s, d) => s + d.amount, 0)
      return {
        name: u.name,
        zohoUserId: u.zohoUserId,
        quota,
        pipeline,
        won,
        pipelineDeals: u.pipelineDeals,
        wonDeals: u.wonDeals,
      }
    })

    // Sort: highest % quota achieved first; users without quota at end
    users.sort((a, b) => {
      const aPct = a.quota != null ? a.won / a.quota : -1
      const bPct = b.quota != null ? b.won / b.quota : -1
      return bPct - aPct
    })

    return NextResponse.json({
      quarter,
      year,
      users,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Quota tracker API error:', err.message)
    return NextResponse.json(
      { error: 'Failed to fetch quota tracker data' },
      { status: 502 }
    )
  }
}
