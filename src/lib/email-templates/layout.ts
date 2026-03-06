// Shared email layout with L10/VG branding
// All CSS is inline for email client compatibility
// Table-based layout for broad client support

const VG_MARK_BASE64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MyA3MyI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5zdDAgeyBmaWxsOiAjZWY0NzNhOyB9CiAgICAgIC5zdDEgeyBmaWxsOiAjMWE1Y2FhOyB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8Zz4KICAgIDxnPgogICAgICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzYuNzEsNTQuNDZsLTExLjktMzUuN2MtMS44LDEuMTYtMy40MiwyLjU5LTQuODIsNC4yMy0uNTUuNjQtMS4wNSwxLjMxLTEuNTEsMmwxMi40OCwzNy40M2MxLjg1LjQyLDMuNzcuNjUsNS43NS42NXMzLjg5LS4yMyw1Ljc1LS42NWw1Ljc2LTE3LjI5aC04LjQxbC0zLjExLDkuMzJaIi8+CiAgICAgIDxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik01Mi40Nyw3LjE4bC04LjY3LDI2aDguNGw3LjA4LTIxLjI1Yy0yLjA2LTEuODUtNC4zNS0zLjQ0LTYuODItNC43NVoiLz4KICAgIDwvZz4KICAgIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik03MC42LDM3LjE3YzAsMS4zNS0uMDksMi42OC0uMjQsMy45OS0xLjg3LDE1Ljg2LTE0LjcyLDI4LjM5LTMwLjcyLDI5Ljc2LS45Ni4wOC0xLjkzLjE0LTIuOTIuMTRzLTEuOTYtLjA1LTIuOTItLjE0Yy0xNy4zMi0xLjQ4LTMwLjk3LTE2LjA1LTMwLjk3LTMzLjc1LDAtMTAuMDIsNC4zNy0xOS4wMywxMS4zLTI1LjI0LDIuMDctMS44NSw0LjM1LTMuNDQsNi44My00Ljc1LDQuNzEtMi40OCwxMC4wNy0zLjksMTUuNzYtMy45LDQuMjYsMCw4LjM0LjgsMTIuMTEsMi4yNGwtMi41Miw3LjU3Yy0yLjk3LTEuMTktNi4yLTEuODQtOS41OC0xLjg0LTQuODIsMC05LjMzLDEuMzItMTMuMiwzLjYyLTIuNDgsMS40OC00LjcsMy4zNS02LjU2LDUuNTQtMy44NCw0LjUyLTYuMTYsMTAuMzctNi4xNiwxNi43NSwwLDEyLjMxLDguNjQsMjIuNjQsMjAuMTYsMjUuMjYsMS44NS40MiwzLjc3LjY1LDUuNzUuNjVzMy45LS4yMyw1Ljc1LS42NWMxMC4yNi0yLjM0LDE4LjIzLTEwLjc3LDE5Ljg2LTIxLjI4aC0yNS42MXYtNy45N2gzMy42NGMuMTYsMS4zMS4yNCwyLjY0LjI0LDMuOTlaIi8+CiAgPC9nPgo8L3N2Zz4K'

interface EmailLayoutOptions {
  content: string
  showUnsubscribe?: boolean
}

export function emailLayout({ content, showUnsubscribe = false }: EmailLayoutOptions): string {
  const unsubscribeRow = showUnsubscribe
    ? `<tr>
        <td style="padding:8px 0 0 0;text-align:center;">
          <a href="{{unsubscribe_url}}" style="font-size:12px;color:#9ca3af;text-decoration:underline;">Unsubscribe from these emails</a>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>L10</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;">

              <!-- Header -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 32px 20px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="vertical-align:middle;">
                          <span style="font-size:28px;font-weight:700;color:#1a5caa;letter-spacing:-0.5px;line-height:1;">L10</span>
                        </td>
                        <td style="vertical-align:middle;text-align:right;">
                          <img src="data:image/svg+xml;base64,${VG_MARK_BASE64}" alt="Value Global" width="32" height="32" style="display:inline-block;vertical-align:middle;" />
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top:4px;">
                          <span style="font-size:12px;color:#6b7280;">powered by Value Global</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td style="padding:0 32px;">
                    <div style="height:1px;background-color:#e5e7eb;"></div>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 32px 32px 32px;">
                    ${content}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 4px 0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Value Global, LLC. All rights reserved.</p>
                    <p style="margin:0 0 4px 0;font-size:12px;color:#9ca3af;">Value Global, LLC &bull; support@valueglobal.net</p>
                  </td>
                </tr>
                ${unsubscribeRow}
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td style="border-radius:6px;background-color:#1a5caa;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:10px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;background-color:#1a5caa;letter-spacing:0.2px;">${text}</a>
      </td>
    </tr>
  </table>`
}
