// src/app/api/zoho/weekly-metrics/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getReportingWindowForDate, searchRecords, ZohoRecord } from '@/lib/zoho'

interface DrilldownItem {
  [key: string]: unknown
}

interface GroupedDrilldown {
  userName: string
  items: DrilldownItem[]
}

/** Group records by a Zoho user field (Created_By or Owner). */
function groupByUser(
  records: ZohoRecord[],
  userField: string,
  mapFn: (r: ZohoRecord) => DrilldownItem,
): GroupedDrilldown[] {
  const grouped: Record<string, { userName: string; items: DrilldownItem[] }> = {}

  for (const r of records) {
    const userObj = r[userField] as { name?: string; id?: string } | null
    const userName = userObj?.name || 'Unknown'
    const key = userObj?.id || userName

    if (!grouped[key]) {
      grouped[key] = { userName, items: [] }
    }
    grouped[key].items.push(mapFn(r))
  }

  return Object.values(grouped).sort((a, b) => b.items.length - a.items.length)
}

export async function GET(request: NextRequest) {
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

  // Get groupId from query params to determine meeting_day
  const groupId = request.nextUrl.searchParams.get('groupId')
  let meetingDay = 4 // default Thursday

  if (groupId) {
    const { data: group } = await supabase
      .from('groups')
      .select('meeting_day')
      .eq('id', groupId)
      .single()
    if (group?.meeting_day != null) {
      meetingDay = group.meeting_day
    }
  }

  // Always show the PREVIOUS completed reporting week (the one reviewed at this week's meeting).
  // Subtracting 7 days from "now" lands in the prior window, so the dashboard shows
  // the last completed week's data — not the in-progress week.
  const now = new Date()
  const prevRef = new Date(now)
  prevRef.setDate(now.getDate() - 7)
  const window = getReportingWindowForDate(meetingDay, prevRef)

  try {
    // Fetch all 5 metrics in parallel using /search endpoint (metrics 4 & 5 share one call)
    const [contacts, events, newDeals, proposalDeals] = await Promise.all([
      // Metric 1: New Contacts created this week
      searchRecords(
        'Contacts',
        'Full_Name,Account_Name,Description,Created_By,Created_Time',
        `(Created_Time:between:${window.start},${window.end})`
      ).catch(() => [] as ZohoRecord[]),

      // Metric 2: First Time Meetings this week
      searchRecords(
        'Events',
        'Event_Title,Who_Id,What_Id,Start_DateTime,Created_By,Created_Time,First_Time_Meeting',
        `((First_Time_Meeting:equals:true)and(Start_DateTime:between:${window.start},${window.end}))`
      ).catch(() => [] as ZohoRecord[]),

      // Metric 3: New Potentials (Deals) created this week
      searchRecords(
        'Deals',
        'Deal_Name,Account_Name,Contact_Name,Amount,Stage,Created_By,Created_Time',
        `(Created_Time:between:${window.start},${window.end})`
      ).catch(() => [] as ZohoRecord[]),

      // Metrics 4 & 5: Proposals (deals at proposal stage, modified this week)
      searchRecords(
        'Deals',
        'Deal_Name,Account_Name,Amount,Stage,Owner,Closing_Date,Modified_Time',
        `((Stage:equals:Prepare Proposal)or(Stage:equals:Presenting Proposal))and(Modified_Time:between:${window.start},${window.end})`
      ).catch(() => [] as ZohoRecord[]),
    ])

    const proposalTotal = proposalDeals.reduce(
      (sum, d) => sum + (Number(d.Amount) || 0), 0
    )

    // Build drilldown data
    const contactsDrilldown = groupByUser(contacts, 'Created_By', (r) => ({
      name: r.Full_Name as string,
      company: (r.Account_Name as { name?: string })?.name || '',
      notes: ((r.Description as string) || '').slice(0, 120),
      created: (r.Created_Time as string || '').slice(0, 10),
    }))

    const eventsDrilldown = groupByUser(events, 'Created_By', (r) => ({
      title: r.Event_Title as string,
      contact: (r.Who_Id as { name?: string })?.name || '',
      company: (r.What_Id as { name?: string })?.name || '',
      date: (r.Start_DateTime as string || '').slice(0, 10),
    }))

    const dealsDrilldown = groupByUser(newDeals, 'Created_By', (r) => ({
      name: r.Deal_Name as string,
      account: (r.Account_Name as { name?: string })?.name || r.Account_Name as string || '',
      contact: (r.Contact_Name as { name?: string })?.name || r.Contact_Name as string || '',
      amount: Number(r.Amount) || 0,
      stage: r.Stage as string,
      created: (r.Created_Time as string || '').slice(0, 10),
    }))

    const proposalsDrilldown = groupByUser(proposalDeals, 'Owner', (r) => ({
      name: r.Deal_Name as string,
      account: (r.Account_Name as { name?: string })?.name || r.Account_Name as string || '',
      amount: Number(r.Amount) || 0,
      stage: r.Stage as string,
      closingDate: (r.Closing_Date as string) || '',
    }))

    return NextResponse.json({
      window: { start: window.start.slice(0, 10), end: window.end.slice(0, 10), label: window.label },
      metrics: {
        contacts: { count: contacts.length, drilldown: contactsDrilldown },
        firstTimeMeetings: { count: events.length, drilldown: eventsDrilldown },
        newPotentials: { count: newDeals.length, drilldown: dealsDrilldown },
        proposalsCount: { count: proposalDeals.length, drilldown: proposalsDrilldown },
        proposalsValue: { total: proposalTotal },
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Zoho weekly-metrics error:', err.message)
    return NextResponse.json(
      { error: 'Failed to fetch weekly metrics' },
      { status: 502 }
    )
  }
}
