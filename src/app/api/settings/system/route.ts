import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in API route */ },
      },
    }
  )
}

export async function GET() {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await getSupabase()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['system_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { notifications_enabled } = body

  if (typeof notifications_enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid value' }, { status: 400 })
  }

  // Get the settings row id
  const { data: settings } = await supabase
    .from('system_settings')
    .select('id')
    .limit(1)
    .single()

  if (!settings) {
    return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('system_settings')
    .update({
      notifications_enabled,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', settings.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
