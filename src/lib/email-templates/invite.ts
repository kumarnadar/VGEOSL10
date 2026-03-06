import { emailLayout, ctaButton } from './layout'

interface InviteEmailOptions {
  name: string
  adminName: string
  inviteLinkUrl: string
}

export function inviteEmail({ name, adminName, inviteLinkUrl }: InviteEmailOptions): {
  subject: string
  html: string
} {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const content = `
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">
      ${adminName} has invited you to join <strong>L10</strong>, your team's EOS management platform.
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">
      Click below to set up your account and get started. This invitation expires in 7 days.
    </p>
    ${ctaButton('Accept Invitation', inviteLinkUrl)}
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;text-align:center;">
      If you weren't expecting this invite, you can safely ignore this email.
      No account will be created unless you click the link above.
    </p>
  `
  return { subject: "You've been invited to L10", html: emailLayout({ content }) }
}
