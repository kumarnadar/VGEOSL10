import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only in API route
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const rawIp = forwarded ?? realIp ?? null
  const ip_address = rawIp ? rawIp.split(',')[0].trim() : null

  const user_agent = request.headers.get('user-agent') ?? null

  const { error } = await supabase
    .from('audit_logins')
    .insert({ user_id: user.id, ip_address, user_agent })

  if (error) {
    console.error('[audit/login] Insert failed:', error.message, { user_id: user.id })
    return NextResponse.json(
      { success: false, error: 'Failed to record login audit' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
