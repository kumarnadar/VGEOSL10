// src/lib/zoho.ts

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'
const ZOHO_API_BASE = 'https://www.zohoapis.com'

/** Generic Zoho CRM record shape (fields vary per module). */
export interface ZohoRecord {
  id: string
  [key: string]: unknown
}

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
 * Compute the reporting window anchored to an arbitrary reference date.
 * The window starts on the most recent occurrence of meetingDay at or before
 * refDate and spans 7 days (start through start+6).
 * Returns ISO date strings suitable for Zoho criteria (YYYY-MM-DDTHH:mm:ssZ).
 */
export function getReportingWindowForDate(
  meetingDay: number,
  refDate: Date,
): { start: string; end: string; label: string } {
  const today = refDate.getDay() // 0=Sun..6=Sat

  // Days since last meeting day (0 = refDate is the meeting day)
  const daysSinceMeeting = (today - meetingDay + 7) % 7

  const windowStart = new Date(refDate)
  windowStart.setDate(refDate.getDate() - daysSinceMeeting)
  windowStart.setHours(0, 0, 0, 0)

  const windowEnd = new Date(windowStart)
  windowEnd.setDate(windowStart.getDate() + 6)
  windowEnd.setHours(23, 59, 59, 999)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const labelStart = windowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const labelEnd = windowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return {
    start: `${fmt(windowStart)}T00:00:00+00:00`,
    end: `${fmt(windowEnd)}T23:59:59+00:00`,
    label: `${labelStart} – ${labelEnd}`,
  }
}

/**
 * Compute the reporting window for "now" (convenience wrapper).
 * Equivalent to getReportingWindowForDate(meetingDay, new Date()).
 */
export function getReportingWindow(meetingDay: number): {
  start: string
  end: string
  label: string
} {
  return getReportingWindowForDate(meetingDay, new Date())
}

/** Search a Zoho CRM module with criteria filtering (paginated, up to 1 000 records). */
export async function searchRecords(
  module: string,
  fields: string,
  criteria: string,
): Promise<ZohoRecord[]> {
  const all: ZohoRecord[] = []
  let page = 1
  let hasMore = true

  while (hasMore && page <= 5) {
    const params = new URLSearchParams({
      fields,
      criteria,
      per_page: '200',
      page: String(page),
    })
    const result = await zohoFetch(`/crm/v7/${module}/search?${params.toString()}`)
    if (result.data) all.push(...result.data)
    hasMore = result.info?.more_records === true
    page++
  }

  return all
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
