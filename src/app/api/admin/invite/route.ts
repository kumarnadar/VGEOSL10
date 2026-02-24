import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { email, fullName, phone, groupId, roleInGroup, systemRole } = body

  if (!email || !fullName) {
    return NextResponse.json(
      { success: false, error: 'Email and full name are required' },
      { status: 400 }
    )
  }

  // Authenticate the calling user via cookie
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'system_admin') {
    return NextResponse.json(
      { success: false, error: 'Only system admins can invite users' },
      { status: 403 }
    )
  }

  // Create admin client with service role key
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Invite user
  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    })

  if (inviteError) {
    return NextResponse.json(
      { success: false, error: inviteError.message },
      { status: 500 }
    )
  }

  const newUserId = inviteData.user.id

  // Update profile with additional fields
  const profileUpdates: Record<string, string> = {}
  if (phone) profileUpdates.phone = phone
  if (systemRole && systemRole !== 'team_member') profileUpdates.role = systemRole

  if (Object.keys(profileUpdates).length > 0) {
    await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', newUserId)
  }

  // Add to group if specified
  if (groupId) {
    await adminClient.from('group_members').insert({
      group_id: groupId,
      user_id: newUserId,
      role_in_group: roleInGroup || 'member',
    })
  }

  return NextResponse.json({ success: true, userId: newUserId })
}
