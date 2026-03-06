import { emailLayout, ctaButton } from './layout'

interface MagicLinkEmailOptions {
  name: string
  magicLinkUrl: string
}

export function magicLinkEmail({ name, magicLinkUrl }: MagicLinkEmailOptions): {
  subject: string
  html: string
} {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const content = `
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">
      Use the secure link below to sign in to your L10 account.
      This link expires in 60 minutes and can only be used once.
    </p>
    ${ctaButton('Sign In to L10', magicLinkUrl)}
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;text-align:center;">
      If you didn't request this link, you can safely ignore this email.
      No action is needed &mdash; your account is secure.
    </p>
  `
  return { subject: 'Your L10 sign-in link', html: emailLayout({ content }) }
}
