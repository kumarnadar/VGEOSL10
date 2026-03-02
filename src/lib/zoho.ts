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
