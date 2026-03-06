import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { inviteEmail } from '@/lib/email-templates/invite'

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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[invite] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json(
      { success: false, error: 'Server configuration error: service role key is missing. Add SUPABASE_SERVICE_ROLE_KEY to environment variables.' },
      { status: 500 }
    )
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  // Generate invite link — Supabase does NOT send the email
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        data: { full_name: fullName },
      },
    })

  if (linkError) {
    console.error('[invite] generateLink error:', linkError.message, linkError)
    return NextResponse.json(
      { success: false, error: `Invite failed: ${linkError.message}` },
      { status: 500 }
    )
  }

  const newUserId = linkData.user.id

  // Look up admin's name for the email
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const adminName = adminProfile?.full_name || 'Your administrator'

  // Send branded invite email via Nodemailer
  const { subject, html } = inviteEmail({
    name: fullName,
    adminName,
    inviteLinkUrl: linkData.properties.action_link,
  })
  await sendEmail({ to: email, subject, html })

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
