// src/app/api/zoho/users/route.ts
// GET /api/zoho/users
// Returns all Zoho CRM users (id, name, email) so admins can map them to EOS profiles.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { zohoFetch } from '@/lib/zoho'

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
    const result = await zohoFetch('/crm/v7/users?type=AllUsers')
    const users = (result.users || []).map((u: any) => ({
      id: u.id,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      email: u.email,
      role: u.role?.name || '',
      status: u.status,
    }))
    return NextResponse.json({ users })
  } catch (err: any) {
    console.error('[zoho/users]', err.message)
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
