import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

async function isNotificationsEnabled(): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('system_settings')
      .select('notifications_enabled')
      .limit(1)
      .single()
    return data?.notifications_enabled ?? true
  } catch {
    console.warn('[mailer] Could not check notification settings, defaulting to enabled')
    return true
  }
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const enabled = await isNotificationsEnabled()
  if (!enabled) {
    console.log(`[mailer] Notifications disabled — email to ${to} suppressed (subject: ${subject})`)
    return { success: true, suppressed: true }
  }

  const from = process.env.SMTP_FROM || '"L10 EOS App" <vgit.development@gmail.com>'

  try {
    const info = await transporter.sendMail({ from, to, subject, html })
    console.log(`[mailer] Email sent to ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`[mailer] Failed to send email to ${to}:`, error)
    throw error
  }
}
