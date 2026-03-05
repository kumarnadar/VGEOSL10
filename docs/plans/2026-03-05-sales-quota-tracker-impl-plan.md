# Sales Quota Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a per-user quota vs pipeline vs closed horizontal bar chart to the Zoho dashboard tab, with quotas stored in the EOS app database and pipeline/won data from Zoho CRM.

**Architecture:** New `user_quotas` table stores quarterly quotas per user. New API endpoint merges quota data with Zoho deal data filtered by quarter. New `ZohoQuotaTracker` component renders a horizontal stacked bar chart (Recharts) with click-through drilldowns. Integrated below CRM Revenue in `ZohoCrmSection`.

**Tech Stack:** Supabase (PostgreSQL), Next.js API routes, Recharts, SWR, shadcn/ui Sheet

---

### Task 1: Database Schema -- user_quotas table

**Files:**
- Create: `scripts/user-quotas-schema.sql`

**Step 1: Write the SQL script**

```sql
-- scripts/user-quotas-schema.sql
-- Creates user_quotas table for quarterly sales quotas
-- Run in Supabase SQL Editor

BEGIN;

CREATE TABLE IF NOT EXISTS user_quotas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quarter smallint NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year smallint NOT NULL CHECK (year BETWEEN 2020 AND 2099),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quarter, year)
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_user_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_user_quotas_updated_at();

-- RLS
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read quotas (needed for dashboard chart)
CREATE POLICY "user_quotas_select_authenticated"
  ON user_quotas FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete quotas
CREATE POLICY "user_quotas_insert_admin"
  ON user_quotas FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('system_admin', 'admin'))
  );

CREATE POLICY "user_quotas_update_admin"
  ON user_quotas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('system_admin', 'admin'))
  );

CREATE POLICY "user_quotas_delete_admin"
  ON user_quotas FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('system_admin', 'admin'))
  );

COMMIT;
```

**Step 2: Commit**

```bash
git add scripts/user-quotas-schema.sql
git commit -m "feat: add user_quotas schema for quarterly sales quotas"
```

**Note:** This SQL must be run manually in Supabase SQL Editor before the API will work.

---

### Task 2: API Endpoint -- /api/zoho/quota-tracker

**Files:**
- Create: `src/app/api/zoho/quota-tracker/route.ts`
- Reference: `src/app/api/zoho/revenue/route.ts` (copy auth + deal fetching pattern)
- Reference: `src/lib/zoho.ts` (zohoFetch, searchRecords)

**Step 1: Create the API route**

This endpoint:
1. Authenticates the caller via Supabase cookie
2. Accepts `quarter` (1-4) and `year` query params (defaults to current quarter)
3. Fetches all deals from Zoho with Closing_Date in that quarter
4. Fetches user_quotas from Supabase for that quarter/year
5. Groups deals by owner, splits into pipeline vs won
6. Returns merged data per user

```typescript
// src/app/api/zoho/quota-tracker/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { zohoFetch } from '@/lib/zoho'

const CLOSED_WON = 'Closed Won'
const CLOSED_LOST = 'Closed Lost'

interface ZohoDeal {
  Deal_Name: string
  Amount: number | null
  Stage: string
  Closing_Date: string | null
  Owner: { name: string; id: string } | null
  Account_Name: { name: string } | string | null
}

interface DrilldownDeal {
  name: string
  account: string
  amount: number
  stage: string
  closingDate: string
}

function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

function getQuarterDateRange(quarter: number, year: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 // 0-indexed: 0, 3, 6, 9
  const endMonth = startMonth + 2
  const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, endMonth + 1, 0).getDate()
  const end = `${year}-${String(endMonth + 1).padStart(2, '0')}-${lastDay}`
  return { start, end }
}

function mapDeal(d: ZohoDeal): DrilldownDeal {
  return {
    name: d.Deal_Name || '',
    account: typeof d.Account_Name === 'object' ? d.Account_Name?.name || '' : String(d.Account_Name || ''),
    amount: d.Amount || 0,
    stage: d.Stage,
    closingDate: d.Closing_Date || '',
  }
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const url = new URL(request.url)
  const quarter = parseInt(url.searchParams.get('quarter') || String(getCurrentQuarter()), 10)
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10)

  if (quarter < 1 || quarter > 4 || year < 2020 || year > 2099) {
    return NextResponse.json({ error: 'Invalid quarter or year' }, { status: 400 })
  }

  try {
    const { start, end } = getQuarterDateRange(quarter, year)

    // Fetch deals with Closing_Date in the quarter (paginated)
    const allDeals: ZohoDeal[] = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= 5) {
      const result = await zohoFetch(
        `/crm/v7/Deals?fields=Deal_Name,Amount,Stage,Closing_Date,Owner,Account_Name&per_page=200&page=${page}`
      )
      if (result.data) allDeals.push(...result.data)
      hasMore = result.info?.more_records === true
      page++
    }

    // Filter deals to the selected quarter by Closing_Date
    const quarterDeals = allDeals.filter(d => {
      if (!d.Closing_Date) return false
      return d.Closing_Date >= start && d.Closing_Date <= end
    })

    // Split into pipeline and won
    const pipelineDeals = quarterDeals.filter(d => d.Stage !== CLOSED_WON && d.Stage !== CLOSED_LOST)
    const wonDeals = quarterDeals.filter(d => d.Stage === CLOSED_WON)

    // Group by owner
    const userMap: Record<string, {
      name: string
      zohoUserId: string
      pipeline: number
      won: number
      pipelineDeals: DrilldownDeal[]
      wonDeals: DrilldownDeal[]
    }> = {}

    for (const d of [...pipelineDeals, ...wonDeals]) {
      const ownerName = d.Owner?.name || 'Unknown'
      const ownerId = d.Owner?.id || ownerName

      if (!userMap[ownerId]) {
        userMap[ownerId] = {
          name: ownerName,
          zohoUserId: ownerId,
          pipeline: 0,
          won: 0,
          pipelineDeals: [],
          wonDeals: [],
        }
      }

      if (d.Stage === CLOSED_WON) {
        userMap[ownerId].won += d.Amount || 0
        userMap[ownerId].wonDeals.push(mapDeal(d))
      } else {
        userMap[ownerId].pipeline += d.Amount || 0
        userMap[ownerId].pipelineDeals.push(mapDeal(d))
      }
    }

    // Fetch quotas from Supabase
    const { data: quotas } = await supabase
      .from('user_quotas')
      .select('user_id, amount')
      .eq('quarter', quarter)
      .eq('year', year)

    // Fetch profiles to map zoho_user_id -> user_id -> quota
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, zoho_user_id')
      .eq('is_active', true)

    const quotaByUserId = new Map<string, number>()
    for (const q of quotas || []) {
      quotaByUserId.set(q.user_id, q.amount)
    }

    const profileByZohoId = new Map<string, { id: string; full_name: string }>()
    for (const p of profiles || []) {
      if (p.zoho_user_id) {
        profileByZohoId.set(p.zoho_user_id, { id: p.id, full_name: p.full_name })
      }
    }

    // Merge: attach quota to each user in userMap
    const users = Object.values(userMap).map(u => {
      const profile = profileByZohoId.get(u.zohoUserId)
      const quota = profile ? quotaByUserId.get(profile.id) ?? null : null
      return {
        ...u,
        name: profile?.full_name || u.name,
        quota,
      }
    })

    // Also add users who have a quota but no deals this quarter
    for (const p of profiles || []) {
      const quota = quotaByUserId.get(p.id)
      if (quota != null && p.zoho_user_id && !userMap[p.zoho_user_id]) {
        users.push({
          name: p.full_name,
          zohoUserId: p.zoho_user_id,
          pipeline: 0,
          won: 0,
          pipelineDeals: [],
          wonDeals: [],
          quota,
        })
      }
    }

    // Sort by % of quota achieved (won/quota), users without quota at the end
    users.sort((a, b) => {
      const pctA = a.quota ? a.won / a.quota : -1
      const pctB = b.quota ? b.won / b.quota : -1
      return pctB - pctA
    })

    return NextResponse.json({
      quarter,
      year,
      users,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Quota tracker API error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch quota data' }, { status: 502 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/zoho/quota-tracker/route.ts
git commit -m "feat: add quota-tracker API endpoint merging Zoho deals with DB quotas"
```

---

### Task 3: Component -- ZohoQuotaTracker

**Files:**
- Create: `src/components/zoho-quota-tracker.tsx`
- Reference: `src/components/zoho-crm-section.tsx` (Sheet drilldown pattern)
- Reference: `src/components/zoho-weekly-metrics.tsx` (UserSection pattern)

**Step 1: Create the component**

The component:
1. Fetches data from `/api/zoho/quota-tracker?quarter=N&year=YYYY`
2. Renders a quarter selector dropdown
3. Renders a horizontal bar chart (Recharts BarChart with layout="vertical")
4. Each bar: green segment (won) + blue segment (pipeline), with a gray ReferenceLine at quota
5. Clicking a bar opens a Sheet with won + pipeline deal tables

Key Recharts config:
- `<BarChart layout="vertical" data={users}>` with `<YAxis dataKey="name" type="category">` and `<XAxis type="number">`
- `<Bar dataKey="won" stackId="a" fill="hsl(142, 76%, 36%)" />` (green)
- `<Bar dataKey="pipeline" stackId="a" fill="hsl(var(--primary))" />` (blue)
- For each user with a quota, render a `<ReferenceLine>` or use a custom shape

Since Recharts ReferenceLine only supports global lines (not per-bar), use a custom bar shape or a composed chart. Simpler approach: render quota as a separate marker layer using a custom `<Cell>` or an additional thin bar.

**Simpler design decision:** Instead of trying to do per-bar reference lines in Recharts (which is complex), show the quota as text labels to the right of each bar: `$95K / $250K quota`. This is cleaner, easier to read, and matches the text mockup from the design doc.

```
Kumar     ████████████████░░░░░░░░  $180K / $250K (72%)
Shree     ██████████████████████──  $220K / $200K (110%) ✓
```

The bar's max width is determined by the largest value across all users (max of quota, pipeline+won). This way bars with no quota still scale properly.

See full component code in Step 1 below.

**Step 2: Commit**

```bash
git add src/components/zoho-quota-tracker.tsx
git commit -m "feat: add ZohoQuotaTracker component with horizontal bar chart and drilldown"
```

---

### Task 4: Integrate into ZohoCrmSection

**Files:**
- Modify: `src/components/zoho-crm-section.tsx`

**Step 1: Import and render ZohoQuotaTracker**

Add below the CRM Revenue card, inside the same `<div className="space-y-6">` wrapper.

In `zoho-crm-section.tsx`:
- Add import: `import { ZohoQuotaTracker } from '@/components/zoho-quota-tracker'`
- Add `<ZohoQuotaTracker groupId={groupId} />` after the CRM Revenue `<Card>` and before the drilldown `<Sheet>`

The component renders inside the `space-y-6` div, so it gets proper spacing automatically.

**Step 2: Commit**

```bash
git add src/components/zoho-crm-section.tsx
git commit -m "feat: integrate quota tracker into Zoho CRM dashboard section"
```

---

### Task 5: Settings UI -- Quota Management

**Files:**
- Modify: `src/components/settings/scorecard-tab.tsx`
- Reference: `src/components/settings/scorecard-tab.tsx` (existing goals editor pattern)

**Step 1: Add Quota Management section to Settings**

Add a new section in the Scorecard settings tab (or a dedicated section) that lets admins:
1. Select quarter + year
2. See a table of active users with their quota amounts
3. Edit quota amounts inline
4. Save via upsert to `user_quotas` table

This follows the same pattern as the existing goals editor in scorecard-tab.tsx. Use a simple table with input fields.

The section should:
- Fetch profiles (active users with zoho_user_id) and existing quotas for the selected quarter
- Show each user name + editable amount field
- "Save Quotas" button that upserts all rows to `user_quotas`
- Toast confirmation on save

**Step 2: Commit**

```bash
git add src/components/settings/scorecard-tab.tsx
git commit -m "feat: add quota management section to scorecard settings"
```

---

### Task 6: Test and Verify

**Step 1: Run the SQL script in Supabase SQL Editor**

Copy `scripts/user-quotas-schema.sql` and run it.

**Step 2: Set test quotas via Settings UI**

Go to Settings > Scorecard tab, set Q1 2026 quotas for each user.

**Step 3: Verify the dashboard**

1. Navigate to Dashboard > Zoho tab
2. Confirm 3 sections visible: Weekly Metrics, CRM Revenue, Sales Quota Tracker
3. Verify bars show won (green) + pipeline (blue) with quota labels
4. Click a user's bar -- verify drilldown Sheet opens with won + pipeline deal tables
5. Switch quarters via dropdown -- verify data updates
6. Verify a user without quota shows bars but no quota label

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: quota tracker adjustments from testing"
```

---

### Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database schema | `scripts/user-quotas-schema.sql` |
| 2 | API endpoint | `src/app/api/zoho/quota-tracker/route.ts` |
| 3 | Chart component | `src/components/zoho-quota-tracker.tsx` |
| 4 | Dashboard integration | `src/components/zoho-crm-section.tsx` |
| 5 | Settings UI for quotas | `src/components/settings/scorecard-tab.tsx` |
| 6 | Test and verify | Manual testing |

**Dependencies:** Task 1 (SQL) must run before Tasks 2-5 can be tested. Tasks 2-4 are sequential. Task 5 is independent of Tasks 3-4.
