# Admin Users Enhancement -- Design Document

**Date:** 2026-02-24
**Status:** Approved
**Author:** Kumar + Claude

## Problem

Admin users page is minimal MVP. The invite feature is broken (uses client-side `admin.inviteUserByEmail()` which requires service role key). No ability to edit user profiles, disable/activate users, or assign groups from the users page. No phone field on profiles.

## Approach

API Route pattern for server-side invite. Enhanced admin page with edit dialog, status toggle, and group assignment. Middleware enforcement for deactivated users.

## Design

### 1. Database Change

```sql
ALTER TABLE profiles ADD COLUMN phone text;
```

Nullable, no format constraint. Displayed in users table and editable in dialogs.

### 2. Server-Side Invite API

**New file:** `src/app/api/admin/invite/route.ts`

- POST endpoint: `{ email, fullName, phone?, groupId, roleInGroup?, systemRole? }`
- Auth check: verify caller is `system_admin` via Supabase cookie
- Creates admin Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- Calls `supabase.auth.admin.inviteUserByEmail(email, { data: { full_name } })`
- Updates profile with phone, geography, role if provided
- If groupId provided, inserts into `group_members`
- Returns JSON `{ success, error?, userId? }`

### 3. Enhanced Users Table

Columns: **Name | Email | Phone | Geography | Role | Groups | Status | Actions**

- **Groups**: comma-separated group names (joined from group_members + groups)
- **Status**: Active/Inactive badge from `is_active`
- **Actions**: Edit button

SWR query joins profiles -> group_members -> groups.

### 4. Invite Dialog (Enhanced)

Fields:
- Full Name (required)
- Email (required)
- Phone (optional)
- Group (required, dropdown of all groups)
- Role in Group (dropdown: member/leader, default: member)
- System Role (dropdown: team_member/group_admin/executive/system_admin, default: team_member)

Calls `POST /api/admin/invite` instead of client-side auth.

### 5. Edit User Dialog

Opened by clicking Edit on a user row. Fields:
- Full Name (text input)
- Email (read-only display)
- Phone (text input)
- Geography (dropdown: US/India/UAE/Other)
- Role (dropdown: team_member/group_admin/executive/system_admin)
- Active (toggle switch)
- Groups (list with remove + "Add to group" picker)

Saves via Supabase client update to `profiles` (RLS allows system_admin).
Group changes via insert/delete on `group_members`.

### 6. Middleware: Block Deactivated Users

**Modified:** `src/lib/supabase/middleware.ts`

After `getUser()`, query `profiles.is_active`. If `false`:
- Clear session cookie
- Redirect to `/login?deactivated=true`

**Modified:** Login page
- If `?deactivated=true` param, show: "Your account has been deactivated. Contact your administrator."

**Performance:** One extra DB query per request. Acceptable for 5-10 user team app.

### 7. Vercel Environment Variable

`SUPABASE_SERVICE_ROLE_KEY` must be added to Vercel project environment variables for production. Already in `.env.local` for local dev.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/admin/invite/route.ts` | NEW | Server-side invite endpoint |
| `src/app/(app)/admin/users/page.tsx` | MODIFY | Full rewrite with enhanced table, invite dialog, edit dialog |
| `src/lib/supabase/middleware.ts` | MODIFY | Add is_active check |
| Login page | MODIFY | Add deactivated message |
| Supabase DB | SQL | `ALTER TABLE profiles ADD COLUMN phone text` |

## Dependencies

- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (already present)
- Same key must be added to Vercel environment variables
- Resend SMTP configured in Supabase (already working for magic links)

## Risks

- **Invite email delivery**: Relies on Supabase + Resend. Currently using `onboarding@resend.dev` sender. Custom domain recommended for production.
- **Middleware DB query**: Adds latency per request. Monitor; cache if needed.
- **Phone format**: No validation -- user enters free-form. Could add validation later if needed.
