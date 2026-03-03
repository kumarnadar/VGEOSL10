// src/lib/zoho.ts

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'
const ZOHO_API_BASE = 'https://www.zohoapis.com'

// In-memory token cache (resets on cold start, which is fine)
let cachedAccessToken: string | null = null
let tokenExpiresAt = 0

/** Get a valid access token, refreshing if expired. */
export async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken
  }

  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  })

  const res = await fetch(ZOHO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    throw new Error(`Zoho token refresh failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  cachedAccessToken = data.access_token
  // Expire 5 minutes early to avoid edge cases
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
  return cachedAccessToken!
}

/**
 * Compute the reporting window (previous full week) based on the group's meeting day.
 * The window ends the day before the meeting day and spans 7 days.
 * Example: meeting_day=4 (Thursday), today is March 2 (Sunday):
 *   - Most recent Thursday = Feb 27
 *   - Window: Feb 20 00:00:00 to Feb 26 23:59:59 (Thu–Wed)
 * Returns ISO date strings for Zoho criteria (YYYY-MM-DDTHH:mm:ssZ).
 */
export function getReportingWindow(meetingDay: number): {
  start: string
  end: string
  label: string
} {
  const now = new Date()
  const today = now.getDay() // 0=Sun..6=Sat

  // Days since last meeting day (0 = today is meeting day)
  let daysSinceMeeting = (today - meetingDay + 7) % 7
  if (daysSinceMeeting === 0) daysSinceMeeting = 7 // if today is meeting day, use previous week

  // The reporting window ends the day before the meeting day
  // and starts 7 days before that end
  const meetingDate = new Date(now)
  meetingDate.setDate(now.getDate() - daysSinceMeeting)
  meetingDate.setHours(0, 0, 0, 0)

  const windowEnd = new Date(meetingDate)
  windowEnd.setDate(meetingDate.getDate() - 1)
  windowEnd.setHours(23, 59, 59, 999)

  const windowStart = new Date(windowEnd)
  windowStart.setDate(windowEnd.getDate() - 6)
  windowStart.setHours(0, 0, 0, 0)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const labelStart = windowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const labelEnd = windowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return {
    start: `${fmt(windowStart)}T00:00:00+00:00`,
    end: `${fmt(windowEnd)}T23:59:59+00:00`,
    label: `${labelStart} – ${labelEnd}`,
  }
}

/** Fetch from the Zoho CRM API with automatic token management. */
export async function zohoFetch(path: string): Promise<any> {
  const token = await getAccessToken()
  const res = await fetch(`${ZOHO_API_BASE}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  })

  if (!res.ok) {
    throw new Error(`Zoho API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
