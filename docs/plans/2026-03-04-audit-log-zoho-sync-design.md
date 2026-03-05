# Design: Login Audit Log + Zoho->Scorecard Sync

**Date:** 2026-03-04
**Status:** Approved

---

## Feature 1: Login Audit Log

### Database

New table `audit_logins`:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK profiles(id) | NOT NULL |
| login_at | timestamptz | DEFAULT now() |
| ip_address | text | nullable, from request headers |
| user_agent | text | nullable, from request headers |

RLS: system_admin can SELECT. Authenticated users can INSERT their own row.

### Capture Mechanism

- Client-side auth state listener detects `SIGNED_IN` event
- POSTs to `/api/audit/login` with no body (user comes from auth, IP/UA from headers)
- API route inserts into `audit_logins`

### Admin UI: Settings > Audit Log Tab (5th tab)

**Summary cards (top):**
- Total logins: today, this week, this month
- Unique users: today, this week, this month

**Filterable table (below):**
- Columns: User Name, Login Time, IP Address, User Agent
- Filters: user dropdown, date range
- Sorted by most recent, paginated (25 per page)

---

## Feature 2: Zoho -> Scorecard Auto-Population

### Profile Schema Additions

| Column | Type | Notes |
|--------|------|-------|
| zoho_user_id | text | nullable, Zoho CRM user ID for mapping |
| team_region | text | nullable, 'US' or 'India', default 'US' |

Editable from Admin Users tab in Settings.

### Scorecard Entry Source Tracking

Add column to `scorecard_entries`:

| Column | Type | Notes |
|--------|------|-------|
| source | text | DEFAULT 'manual', values: 'manual' or 'zoho' |

### Measure Mapping

The existing `zoho_field_mapping` column on `scorecard_measures` is used:

| zoho_field_mapping | Zoho Metric | Scorecard Measure |
|--------------------|-------------|-------------------|
| zoho:contacts | contacts per user | Contacts Created |
| zoho:firstTimeMeetings | firstTimeMeetings per user | First Time Meetings |
| zoho:newPotentials | newPotentials per user | New Potentials Created |
| zoho:proposalsCount | proposalsCount per user | Proposals Delivered (#) |
| zoho:proposalsValue | proposalsValue per user | Proposals Delivered ($) |

Set on both US Team (5 measures) and India Team (5 measures) sections.

### Sync API Route: POST /api/zoho/sync-scorecard

**Parameters:**
- `groupId` (required) -- which group to sync
- `weekEnding` (required) -- the week_ending date to populate
- `weeks` (optional, default 1) -- number of weeks to backfill (goes backward from weekEnding)

**Logic:**
1. Auth check: must be system_admin
2. For each week in range:
   a. Calculate the Zoho reporting window for that week_ending
   b. Call existing `searchRecords()` to get Zoho data for each metric
   c. Group results by Zoho user
   d. Map Zoho user ID -> profiles via `profiles.zoho_user_id`
   e. Map profile -> team_region -> correct scorecard section (US/India)
   f. Look up measure IDs by name + section
   g. Upsert into `scorecard_entries` (measure_id, user_id, week_ending, value, source='zoho')
3. Return summary: { weeksProcessed, entriesCreated, entriesUpdated, unmappedUsers }

### Vercel Cron: /api/cron/sync-scorecard

- Runs every Saturday at 6:00 AM UTC
- Finds all groups with `show_zoho_crm = true`
- Calculates last completed week_ending for each group
- Calls sync logic for each group
- Secured with `CRON_SECRET` env var

### Manual Sync: Settings > Scorecard Tab

- "Sync from Zoho" button (admin only)
- Calls POST /api/zoho/sync-scorecard with current group and last week_ending
- Shows success/error toast with sync summary

### Backfill

- Same API route with `weeks=5` to populate last 5 weeks
- Run once via admin UI or curl after initial setup

### Scorecard Grid Changes

- Cells with `source='zoho'` show a small "Z" badge (Zoho indicator)
- Cells remain editable (user chose "editable with warning")
- Tooltip on Zoho cells: "Synced from Zoho CRM. Manual edits will be overwritten on next sync."
- When user manually edits a Zoho cell, source changes to 'manual' (sync will overwrite back to 'zoho' on next run)

### SQL Scripts Needed

1. `scripts/audit-login-schema.sql` -- audit_logins table + RLS
2. `scripts/profile-zoho-fields.sql` -- Add zoho_user_id, team_region to profiles
3. `scripts/scorecard-source-column.sql` -- Add source column to scorecard_entries
4. `scripts/zoho-measure-mapping.sql` -- UPDATE scorecard_measures SET zoho_field_mapping

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Login capture | Client-side auth listener | Works with Supabase hosted, no webhook config needed |
| Zoho user mapping | zoho_user_id on profiles | Explicit, admin-controlled, one-time setup |
| Team routing | team_region on profiles | Simple US/India flag, routes to correct scorecard section |
| Sync trigger | Vercel Cron + manual button | Automated weekly, with admin override capability |
| Cell editing | Editable with warning | Users can override but are warned sync will overwrite |
| Current week | Dashboard only | Scorecard populated only after week completes |
