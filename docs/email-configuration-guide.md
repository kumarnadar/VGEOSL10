# EOS App - Email Configuration Guide

**Prepared by:** Kumar
**Date:** March 5, 2026
**For:** Network Admin (IONOS DNS)
**Purpose:** Enable magic link authentication emails for the EOS L10 Platform

---

## Why This Is Needed

The EOS L10 Platform (hosted at https://vgeosl-10.vercel.app) uses **magic link authentication** -- users enter their email, receive a login link, and click it to sign in. No passwords are involved.

The platform backend is **Supabase** (a hosted PostgreSQL + auth service). Supabase handles user authentication and sends the magic link emails. By default, Supabase uses its own email service with a strict rate limit of **4 emails per hour** across all users. This is insufficient for our team.

To remove this limit, we need to configure a custom email sending service. This document covers two options.

---

## Architecture Overview

```
User clicks "Send Login Link"
        |
        v
Browser --> Vercel (Next.js app) --> Supabase Auth (GoTrue)
                                          |
                                          v
                                   Email Service (SMTP)
                                          |
                                          v
                                   User's Inbox (magic link email)
                                          |
                                          v
                                   User clicks link --> Authenticated
```

Supabase Auth generates the magic link token and hands the email off to whichever SMTP service is configured. The email contains a one-time link that expires after 1 hour.

---

## Option A: Resend (Recommended)

### What is Resend?

Resend is a transactional email service built on top of Amazon SES. It is purpose-built for automated system emails (login links, notifications, password resets). It does not require a mailbox -- it is send-only.

- **Free tier:** 3,000 emails/month, 100 emails/day
- **No mailbox needed** -- purely for sending system-generated emails
- **High deliverability** -- purpose-built infrastructure with DKIM/SPF/DMARC support

### What the DNS records do

| Record | Purpose |
|--------|---------|
| **DKIM** (TXT at `resend._domainkey`) | Cryptographically signs outgoing emails so receiving servers can verify they genuinely came from valueglobal.net. Prevents spoofing. |
| **MX** (at `send` subdomain) | Routes bounce/feedback emails for the `send.valueglobal.net` subdomain to Amazon SES. Does NOT affect root domain email. |
| **SPF** (TXT at `send` subdomain) | Authorizes Amazon SES to send emails on behalf of `send.valueglobal.net`. Does NOT affect root domain SPF. |
| **DMARC** (TXT at `_dmarc`) | Tells receiving servers how to handle emails that fail DKIM/SPF checks. Set to `p=none` (monitor only -- no emails are rejected or quarantined). |

### Impact on Existing Email

- **Root domain MX records:** NOT affected. The MX record is for `send.valueglobal.net`, not `valueglobal.net`.
- **Root domain SPF:** NOT affected. The SPF record is for `send.valueglobal.net`.
- **Email forwarding:** NOT affected. No existing DNS records are modified.
- **Spam reputation:** IMPROVED. DKIM + SPF + DMARC improve deliverability of system emails. Without them, magic link emails are more likely to land in spam.

### DNS Records to Add (IONOS)

Log in to https://my.ionos.com > Domains & SSL > valueglobal.net > DNS > Add Record.

IONOS auto-appends `.valueglobal.net` to the host name. Enter only the short name shown below.

**Record 1 -- DKIM (Domain Verification)**

| Field | Value |
|-------|-------|
| Type | TXT |
| Host Name | `resend._domainkey` |
| Value | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3DuzH24SnbwH5Q8r9emwNJfzFd88Jh4T9yaMVS6TK3XL0t6u8RT8wGB3Rgcu5WKXkNn4KVBEmhx4uLOY0fnJy82yE5O/NiTPSRwqPFk9aXIGokUzx+1Ue7w6PJw7yQDmuHHRB784YmqfnT3WJwx3jp0vUrcw05upk7dGM9Aa7dQIDAQAB` |
| TTL | Default (1 hour or Auto) |

**Record 2 -- MX (Sending Subdomain)**

| Field | Value |
|-------|-------|
| Type | MX |
| Host Name | `send` |
| Points to | `feedback-smtp.us-east-1.amazonses.com` |
| Priority | `10` |
| TTL | Default |

**Record 3 -- SPF (Sending Authorization)**

| Field | Value |
|-------|-------|
| Type | TXT |
| Host Name | `send` |
| Value | `v=spf1 include:amazonses.com ~all` |
| TTL | Default |

**Record 4 -- DMARC (Optional but Recommended)**

| Field | Value |
|-------|-------|
| Type | TXT |
| Host Name | `_dmarc` |
| Value | `v=DMARC1; p=none;` |
| TTL | Default |

### After Adding DNS Records

1. Wait 5-30 minutes for DNS propagation (can take up to 48 hours in rare cases).
2. Go to Resend dashboard (Kumar has access) and click **Verify** on the valueglobal.net domain.
3. Once verified, Supabase will automatically use Resend for all outgoing auth emails.

### Supabase Configuration (Already Done)

Resend SMTP is already configured in Supabase Dashboard > Authentication > SMTP Settings:

| Setting | Value |
|---------|-------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | (API key -- already configured) |
| Sender email | `noreply@valueglobal.net` (or configured sender) |

No changes needed on the Supabase side once DNS is verified.

---

## Option B: Gmail SMTP (Alternative / Fallback)

If DNS changes are delayed or not possible, we can use an existing Gmail-hosted email account as the SMTP sender.

### How It Works

Instead of Resend, Supabase sends magic link emails through Gmail's SMTP server using the account `kumarnVG@valueglobal.net` (hosted on Google Workspace).

### Setup Steps

1. **Enable 2FA** on the Google account (required for App Passwords).
2. **Generate an App Password:** Google Account > Security > 2-Step Verification > App Passwords > Create one for "Mail".
3. **Configure in Supabase Dashboard** > Authentication > SMTP Settings:

| Setting | Value |
|---------|-------|
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | `kumarnVG@valueglobal.net` |
| Password | (App Password from step 2) |
| Sender email | `kumarnVG@valueglobal.net` |

4. **No DNS changes required** (assuming Google Workspace SPF/DKIM are already configured for valueglobal.net).

### Limitations

| Concern | Detail |
|---------|--------|
| **Rate limit** | 500 emails/day (sufficient for current team size of ~6 users) |
| **Account lockout risk** | Google may flag automated sends as suspicious and temporarily lock the account |
| **App Password requirement** | 2FA must be enabled; App Password is separate from regular password |
| **Mixed mailbox** | Users may accidentally reply to magic link emails, which would land in kumarnVG's inbox |
| **Not designed for transactional email** | Gmail is a personal/business email service, not a transactional email platform |

### When to Use Option B

- DNS access is blocked or delayed beyond acceptable timeline
- Temporary workaround while waiting for Option A DNS propagation
- Testing/validation before committing to Option A

---

## Recommendation

**Option A (Resend)** is the recommended long-term solution. The DNS records are a one-time setup that does not affect existing email infrastructure. Once verified, it provides reliable, high-deliverability transactional email with no rate limiting concerns.

**Option B (Gmail SMTP)** is a valid short-term fallback if DNS changes cannot be made immediately.

---

## Contact

For questions about the application or Supabase configuration, contact Kumar.
For DNS record changes, the network admin can proceed with the IONOS instructions above.
