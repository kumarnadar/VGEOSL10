# Implementation Plan: Login Audit Log + Zoho->Scorecard Sync

**Date:** 2026-03-04
**Design:** 2026-03-04-audit-log-zoho-sync-design.md

---

## Phase 1: Database Schema (SQL Scripts)

### Task 1.1: Audit Logins Table
- Create `scripts/audit-login-schema.sql`
- Table: audit_logins (id, user_id, login_at, ip_address, user_agent)
- RLS: system_admin SELECT, authenticated INSERT own row
- Index on user_id, login_at

### Task 1.2: Profile Schema Extensions
- Create `scripts/profile-zoho-fields.sql`
- Add `zoho_user_id text` to profiles
- Add `team_region text DEFAULT 'US'` to profiles
- UPDATE profiles SET team_region = 'India' WHERE full_name ILIKE '%Nirmiti%'

### Task 1.3: Scorecard Entry Source Column
- Create `scripts/scorecard-source-column.sql`
- Add `source text DEFAULT 'manual'` to scorecard_entries
- CHECK constraint: source IN ('manual', 'zoho')

### Task 1.4: Zoho Measure Mapping
- Create `scripts/zoho-measure-mapping.sql`
- UPDATE scorecard_measures SET zoho_field_mapping for 10 measures (5 US + 5 India)

## Phase 2: Login Audit Feature

### Task 2.1: Login Audit API Route
- Create `/api/audit/login/route.ts` (POST)
- Extract user from auth, IP from x-forwarded-for, UA from user-agent header
- Insert into audit_logins
- Return 200

### Task 2.2: Client-side Login Listener
- Modify auth provider/middleware to detect SIGNED_IN event
- POST to /api/audit/login on sign-in
- Fire-and-forget (don't block auth flow)

### Task 2.3: Audit Log Admin Tab
- Create `src/components/settings/audit-tab.tsx`
- Summary cards: logins today/week/month, unique users today/week/month
- Filterable table: user dropdown, date range, paginated
- Add as 5th tab in Settings page

## Phase 3: Zoho->Scorecard Sync

### Task 3.1: Sync API Route
- Create `/api/zoho/sync-scorecard/route.ts` (POST)
- Accept groupId, weekEnding, weeks params
- Reuse searchRecords() from weekly-metrics route (extract to shared lib)
- Map Zoho users -> profiles via zoho_user_id
- Route to US/India measures via team_region
- Upsert scorecard_entries with source='zoho'
- Return sync summary

### Task 3.2: Extract Shared Zoho Search Functions
- Move searchRecords() and groupByUser() from weekly-metrics route to src/lib/zoho.ts
- Update weekly-metrics route to import from shared lib

### Task 3.3: Vercel Cron Route
- Create `/api/cron/sync-scorecard/route.ts`
- Verify CRON_SECRET from Authorization header
- Find groups with show_zoho_crm = true
- Calculate last completed week_ending per group
- Call sync logic for each group
- Add cron config to vercel.json

### Task 3.4: Admin Users - Zoho ID + Team Region Fields
- Update Settings > Users tab to show/edit zoho_user_id and team_region
- Add fields to the edit user form

### Task 3.5: Manual Sync Button
- Add "Sync from Zoho" button to Settings > Scorecard tab
- Calls POST /api/zoho/sync-scorecard
- Shows toast with sync results

### Task 3.6: Scorecard Grid - Zoho Badge + Warning
- Show "Z" badge on cells where entry.source === 'zoho'
- Tooltip: "Synced from Zoho CRM. Manual edits will be overwritten on next sync."
- When user manually edits, source changes to 'manual'

## Phase 4: Verification

### Task 4.1: Run SQL scripts in Supabase SQL Editor
### Task 4.2: Test login audit capture and admin page
### Task 4.3: Set zoho_user_id on profiles, run backfill sync for 5 weeks
### Task 4.4: Verify scorecard grid shows Zoho badges and correct values

---

## Execution Order

Phase 1 (all SQL scripts) -> Phase 2 (audit) -> Phase 3 (sync) -> Phase 4 (verify)

Within Phase 2 and 3, tasks are sequential within each phase but Phase 2 and 3 are independent of each other.
