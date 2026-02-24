# EOS App -- Handoff Document

**Date:** February 24, 2026 (Session 2 update)
**Purpose:** Everything the next agent needs to continue this project in a single file.

---

## 1. What Is This Project?

An EOS L10 Meeting & Rock Management platform for Value Global. Replaces an Excel workbook (`SalesEOSL10.xlsx`) with a web app. Key features: rock tracking with milestones, Top 10 focus tracker (weekly snapshots), issues/to-dos with IDS workflow, L10 meeting management with scoring, executive dashboard with drill-down, rock ideas backlog.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase (PostgreSQL, Auth, RLS) + SWR + Vercel

---

## 2. Current State -- What Is Done

**ALL 20 original tasks COMPLETE. All post-MVP enhancements COMPLETE. Deployed to Vercel. Seed data loaded. RLS security fixes applied.**

### Original MVP (Tasks 1-20)

| Task | Description | Status |
|------|-------------|--------|
| 1 | Project scaffold, shadcn, .env files | Done |
| 2 | Database schema (14 tables, triggers, indexes) | Done |
| 3 | RLS policies (45 policies, 3 helper functions) | Done |
| 4 | RPC functions (3 functions) | Done |
| 5 | Supabase client (browser + server + middleware) | Done |
| 6 | TypeScript types | Done |
| 7 | Login page (magic link) | Done |
| 8 | App layout + sidebar | Done |
| 9 | Admin pages (users, groups, quarters) + UserPicker | Done |
| 10 | Rock list + quarter selector | Done |
| 11 | Rock detail + milestone management | Done |
| 12 | Rock creation + completion/roll-forward | Done |
| 13 | Focus tracker (inline editing, week navigator) | Done |
| 14 | Issues page (IDS workflow) | Done |
| 15 | To-dos (completion toggle, due dates) | Done |
| 16 | Meeting list + creation | Done |
| 17 | Meeting view (agenda-driven, scoring) | Done |
| 18 | Rock ideas page (priority colors, promote-to-rock) | Done |
| 19 | Executive dashboard | Done |
| 20 | Polish + Deploy | Done |

### Post-MVP Enhancements

| Feature | Commit(s) | Description |
|---------|-----------|-------------|
| Frontend Design Refresh | `a3c24d3` | DM Sans + Montserrat typography, sidebar redesign, KPI card accents, login animations, skeleton loaders, empty states, meeting stepper, dark mode |
| Dashboard Drill-Down | `e3cf0aa` | Group selector, clickable KPI cards, table cell drill-down links, FilterChip, URL param filters |
| Top 10 Card Redesign | `778833a` | Card-based layout, member dropdown filter, full content visibility |
| Rocks Person Filter | `e688adc` | Person dropdown defaults to "My Rocks", includes "All Members" option |
| Top 10 Group Review | `e688adc` | 5th KPI card (purple), dialog with list/detail views grouped by user |
| Responsive Design | `c5611dd` | Mobile hamburger sidebar (Sheet), responsive KPI grid, flex-wrap headers, overflow-x-auto tables |
| RLS Security Fixes | `c5611dd` + SQL | Privilege escalation trigger, RPC authorization checks, rocks_insert admin bypass |
| Admin Route Protection | `c5611dd` | Server-side admin layout redirects non-system_admin |
| KPI Card Alignment | `a2e1260`, `fc1becf` | h-full cards, responsive grid breakpoints, "This week" subtitle |
| Issues Page Redesign | `6f0d095` | Table layout, 3 filter dropdowns, detail dialog, Issues/To-Dos tabs |
| VG Logo in Sidebar | `0e4635b` | VG circle mark (28px) beside EOS L10 text |

### Deployment & Data

| Item | Status |
|------|--------|
| Git + GitHub | COMPLETE (https://github.com/kumarnadar/VGEOSL10) |
| Vercel Deploy | COMPLETE (https://vgeosl-10.vercel.app, auto-deploys from main) |
| Seed Data | LOADED (users, groups, rocks, issues, todos, meetings, focus data) |
| Email (Resend SMTP) | COMPLETE (onboarding@resend.dev test sender) |
| RLS Security SQL | APPLIED (scripts/fix-rls-security.sql executed in Supabase) |

---

## 3. What Remains

### Immediate Priorities

1. **Visual QA on Vercel** -- Test all new features live (rocks filter, Top 10 modal, issues table, mobile sidebar, VG logo).
2. **RLS Manual Testing** -- Verify security fixes with different user roles. Matrix below.
3. **User Acceptance Testing** -- Demo to team, collect feedback.

### RLS Test Matrix

| Table | Team Member (own group) | Team Member (other group) | Executive | System Admin |
|-------|------------------------|--------------------------|-----------|-------------|
| profiles | SELECT: all | SELECT: all | SELECT: all | SELECT: all, UPDATE: all |
| profiles.role | UPDATE: blocked (trigger) | blocked | blocked | UPDATE: allowed |
| rocks | SELECT/INSERT/UPDATE: own group | SELECT: denied | SELECT: all groups | Full access |
| focus_items | SELECT: own group, UPDATE: own current | denied | SELECT: all | Full access |
| issues | SELECT/INSERT/UPDATE: own group | denied | SELECT: all | Full access |
| RPC functions | Authorized caller only | denied | varies | Full access |
| /admin/* routes | Redirected to /dashboard | Redirected | Redirected | Allowed |

### Future Enhancements (Not Started)
- Cross-group list pages (deferred from drill-down design)
- Table/card view toggle on list pages
- Resend custom domain verification
- Real-time updates (WebSocket, currently 30s polling)
- Notification system (OneSignal)

---

## 4. Key Credentials

All credentials in `C:\Work\VG\Products\EOSApp\Keys.txt`:
- **Supabase Project URL:** `https://lcnepordyzenssljlebp.supabase.co`
- **Supabase Project ID:** `lcnepordyzenssljlebp`
- **GitHub Repo:** `https://github.com/kumarnadar/VGEOSL10`

The `.env.local` file at `eos-app/.env.local` is populated with these values.

---

## 5. Directory Structure

```
C:\Work\VG\Products\EOSApp\              <-- Project root
  Keys.txt                               <-- Credentials (NOT in git)
  VG_EOS_L10_BRD_v1.docx                <-- Business requirements
  SalesEOSL10.xlsx                       <-- Excel being replaced
  docs/plans/
    HANDOFF.md                           <-- THIS FILE
    session-context.md                   <-- Session resumption context
    2026-02-23-eos-architecture-design.md
    2026-02-23-eos-prd.md
    2026-02-23-eos-implementation-plan.md
    2026-02-24-dashboard-drilldown-design.md
    2026-02-24-dashboard-drilldown-plan.md
    2026-02-24-rocks-filter-top10-review-design.md
    2026-02-24-rocks-filter-top10-review-plan.md

C:\Work\VG\Products\EOSApp\eos-app\      <-- Next.js app (git repo)
  .env.local                             <-- Supabase credentials (gitignored)
  scripts/
    seed-demo-data.sql                   <-- Demo data (already loaded)
    fix-rls-security.sql                 <-- RLS security fixes (already applied)
  public/
    vg-mark.svg                          <-- VG circle logo mark
    vg-logo.svg                          <-- Full VG wordmark
  src/
    middleware.ts
    lib/
      utils.ts
      supabase/client.ts, server.ts, middleware.ts
      types/database.ts
    hooks/
      use-user.ts                        <-- Auth + profile with groups
      use-rocks.ts                       <-- Rocks + quarters SWR hooks
      use-focus.ts                       <-- Focus snapshots SWR hooks
    components/
      ui/                                <-- 16 shadcn components (incl. skeleton)
      sidebar.tsx                        <-- Mobile hamburger, VG logo, icons, avatars
      dashboard-grid.tsx                 <-- KPI cards (5 accents), tables with drill-down
      focus-table.tsx                    <-- Card-based layout (was table)
      top10-review-dialog.tsx            <-- Top 10 group review modal (list/detail)
      issue-detail-dialog.tsx            <-- Issue detail modal (status, resolution)
      filter-chip.tsx                    <-- Dismissible filter indicator
      empty-state.tsx                    <-- Reusable empty state with CTA
      page-skeleton.tsx                  <-- Card/table/KPI skeleton loaders
      providers.tsx                      <-- ThemeProvider for dark mode
      meeting-agenda.tsx                 <-- Enhanced stepper with color states
      rock-card.tsx                      <-- Card with hover effects + progress bar
      [+ all original components]
    app/
      layout.tsx                         <-- DM Sans + Montserrat fonts, ThemeProvider
      globals.css                        <-- Animations, card-hover, table-striped, geo-pattern
      (auth)/login/page.tsx              <-- Animated login with geo pattern
      (app)/
        layout.tsx                       <-- Sidebar + mobile header bar
        dashboard/page.tsx               <-- 5 KPI cards + Top 10 review dialog
        rock-ideas/page.tsx
        admin/
          layout.tsx                     <-- Server-side admin role guard
          {users,groups,quarters}/page.tsx
        groups/[groupId]/
          rocks/page.tsx                 <-- Person filter + quarter selector
          rocks/[rockId]/page.tsx
          focus/page.tsx                 <-- Member dropdown filter + week nav
          issues/page.tsx                <-- Table + filters + tabs (Issues/To-Dos)
          meetings/page.tsx
          meetings/[meetingId]/page.tsx
```

---

## 6. Architecture Patterns

- **Data fetching:** `useSWR(key, fetcherFn)` with Supabase client SDK. 30s polling.
- **Auth:** Magic link via `supabase.auth.signInWithOtp()`. Middleware refreshes session.
- **Route groups:** `(auth)` for public, `(app)` for authenticated with sidebar layout.
- **Admin protection:** Server-side layout checks `profiles.role` and redirects non-admins.
- **Styling:** Tailwind CSS v4 + shadcn/ui. DM Sans body font, Montserrat headings. CSS custom properties for theming (OKLch colors). Dark mode via next-themes.
- **Dashboard drill-down:** Group selector filters all queries. KPI cards render as Links (with query params) or onClick (opens dialog). Receiving pages read `searchParams` for filters.
- **Top 10 review:** Dialog fetches all focus_snapshots for current week, groups by user, supports list/detail views.
- **Issues:** Table layout with 3 filter dropdowns (raised by, priority, status). Detail dialog for full view + status change.
- **Rocks filter:** Person dropdown defaults to current user, supports "All Members" + individual members.
- **Responsive:** Sidebar hidden below `lg` with Sheet overlay. KPI grid responsive (`md:2, lg:3, xl:5`). Flex-wrap headers.
- **RLS:** All access via Supabase client with user JWT. 45 policies + trigger preventing role escalation + RPC authorization checks.

---

## 7. Known Issues / Lessons

- Supabase CLI remote push doesn't work (IPv6/auth) -- use SQL Editor instead
- RLS functions must be in `public` schema, not `auth` (permission denied)
- Implementation plan file still shows old `auth.*` references -- actual code uses `public.*`
- Dashboard uses `as any` cast for Supabase join type issue
- shadcn `toast` deprecated -- use `sonner` instead
- Bash on Windows: quote paths containing parentheses in git commands
- `supabase.auth.admin.inviteUserByEmail()` in admin/users is dead code (requires service role key) -- falls through to `signInWithOtp`

---

## 8. How to Run Locally

```bash
cd C:\Work\VG\Products\EOSApp\eos-app
npm run dev
# Opens at http://localhost:3000
```

---

## 9. Team

- **Kumar** -- Project owner, system_admin role
- **Shree** -- Co-admin, system_admin role
- **Michael, Jason** -- BDev team members
- **Nirmiti** -- Async participant (India timezone)

---

## 10. Reference Documents

- **Design docs:** `docs/plans/2026-02-24-rocks-filter-top10-review-design.md`
- **Implementation plans:** `docs/plans/2026-02-24-rocks-filter-top10-review-plan.md`
- **Drill-down design:** `docs/plans/2026-02-24-dashboard-drilldown-design.md`
- **Drill-down plan:** `docs/plans/2026-02-24-dashboard-drilldown-plan.md`
- **PRD:** `docs/plans/2026-02-23-eos-prd.md` (59 requirements)
- **Architecture:** `docs/plans/2026-02-23-eos-architecture-design.md`
- **Original impl plan:** `docs/plans/2026-02-23-eos-implementation-plan.md` (NOTE: `auth.*` refs are outdated)
