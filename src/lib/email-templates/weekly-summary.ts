import { emailLayout, ctaButton } from './layout'

interface WeeklySummaryEmailOptions {
  name: string
  weekEnding: string
  onTrack: number
  offTrack: number
  missed: number
  noData: number
  measures: Array<{ name: string; actual: string; goal: string; status: 'on-track' | 'off-track' | 'missed' }>
  scorecardUrl: string
}

export function weeklySummaryEmail({
  name,
  weekEnding,
  onTrack,
  offTrack,
  missed,
  noData,
  measures,
  scorecardUrl,
}: WeeklySummaryEmailOptions): {
  subject: string
  html: string
} {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const statusColors: Record<string, string> = {
    'on-track': '#16a34a',
    'off-track': '#eab308',
    'missed': '#dc2626',
  }
  const measuresRows = measures
    .map(
      (m) => `
    <tr>
      <td style="padding:8px 12px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">${m.name}</td>
      <td style="padding:8px 12px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:center;">${m.actual}</td>
      <td style="padding:8px 12px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:center;">${m.goal}</td>
      <td style="padding:8px 12px;font-size:14px;color:${statusColors[m.status] || '#374151'};border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;">${m.status.replace('-', ' ')}</td>
    </tr>
  `,
    )
    .join('')

  const content = `
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
    <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">
      Here's your scorecard summary for the week ending <strong>${weekEnding}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px;text-align:center;background-color:#f0fdf4;border-radius:6px 0 0 6px;">
          <span style="font-size:20px;font-weight:700;color:#16a34a;">${onTrack}</span><br/>
          <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">On Track</span>
        </td>
        <td style="padding:12px;text-align:center;background-color:#fefce8;">
          <span style="font-size:20px;font-weight:700;color:#eab308;">${offTrack}</span><br/>
          <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Off Track</span>
        </td>
        <td style="padding:12px;text-align:center;background-color:#fef2f2;">
          <span style="font-size:20px;font-weight:700;color:#dc2626;">${missed}</span><br/>
          <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Missed</span>
        </td>
        <td style="padding:12px;text-align:center;background-color:#f9fafb;border-radius:0 6px 6px 0;">
          <span style="font-size:20px;font-weight:700;color:#6b7280;">${noData}</span><br/>
          <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">No Data</span>
        </td>
      </tr>
    </table>
    ${
      measures.length > 0
        ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
      <tr style="background-color:#f9fafb;">
        <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Measure</th>
        <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:center;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Actual</th>
        <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:center;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Goal</th>
        <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:center;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Status</th>
      </tr>
      ${measuresRows}
    </table>`
        : ''
    }
    ${ctaButton('View Full Scorecard', scorecardUrl)}
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;text-align:center;">
      This is an automated weekly summary from L10.
    </p>
  `
  return {
    subject: `L10 Weekly Scorecard — Week Ending ${weekEnding}`,
    html: emailLayout({ content, showUnsubscribe: true }),
  }
}
