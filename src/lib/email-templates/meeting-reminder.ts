import { emailLayout, ctaButton } from './layout'

interface MeetingReminderEmailOptions {
  name: string
  meetingName: string
  startTime: string
  openIssues: number
  offTrackRocks: number
  dueTodos: number
  dashboardUrl: string
}

export function meetingReminderEmail({
  name,
  meetingName,
  startTime,
  openIssues,
  offTrackRocks,
  dueTodos,
  dashboardUrl,
}: MeetingReminderEmailOptions): {
  subject: string
  html: string
} {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const content = `
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
    <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">
      Your <strong>${meetingName}</strong> meeting starts in <strong>${startTime}</strong>.
    </p>
    <p style="margin:0 0 8px 0;font-size:15px;color:#374151;line-height:1.6;">Please review before the meeting:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;background-color:#f9fafb;border-radius:6px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:15px;color:#374151;"><span style="color:#ef473a;font-weight:700;">${openIssues}</span> open issues</td></tr>
            <tr><td style="padding:4px 0;font-size:15px;color:#374151;"><span style="color:#ef473a;font-weight:700;">${offTrackRocks}</span> rocks off-track</td></tr>
            <tr><td style="padding:4px 0;font-size:15px;color:#374151;"><span style="color:#ef473a;font-weight:700;">${dueTodos}</span> to-dos due this week</td></tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton('Open L10 Dashboard', dashboardUrl)}
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;text-align:center;">
      If you have updates, log them before the meeting starts.
    </p>
  `
  return {
    subject: `L10 Meeting Reminder — ${meetingName} Today`,
    html: emailLayout({ content, showUnsubscribe: true }),
  }
}
