import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { magicLinkEmail } from '@/lib/email-templates/magic-link'

// Simple in-memory rate limiter: map of email -> timestamps
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_MAX = 5

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(email) || []
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW)
  rateLimitMap.set(email, recent)
  if (recent.length >= RATE_LIMIT_MAX) return true
  recent.push(now)
  rateLimitMap.set(email, recent)
  return false
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (isRateLimited(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('[send-magic-link] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // Generate the magic link — Supabase does NOT send the email
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })

    if (error) {
      console.error('[send-magic-link] generateLink error:', error.message)
      // Don't reveal whether the email exists
      return NextResponse.json({ success: true })
    }

    // Look up user's name for personalized greeting
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', data.user.id)
      .single()

    const name = profile?.full_name || ''

    // Build and send branded email
    const magicLinkUrl = data.properties.action_link
    const { subject, html } = magicLinkEmail({ name, magicLinkUrl })
    await sendEmail({ to: normalizedEmail, subject, html })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[send-magic-link] Unexpected error:', error)
    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true })
  }
}
