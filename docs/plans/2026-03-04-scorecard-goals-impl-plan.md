# Scorecard Goals Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add goal_type (weekly/cumulative/point_in_time) to measures, configurable thresholds per goal, baseline values for cumulative tracking, cell locking for point-in-time past weeks, per-cell coloring, and simplify Zoho sync to current-week only.

**Architecture:** Add `goal_type` column to `scorecard_measures`, add `baseline_value` + threshold columns to `scorecard_goals`. Update the scorecard grid to render three display modes with per-cell coloring. Update Settings UI to configure goal_type, baseline, and thresholds per measure. Remove backfill from Zoho sync, keep current-week only.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL), React, shadcn/ui, Tailwind CSS

---

### Task 1: Database Migration -- Add goal_type, baseline_value, thresholds

**Files:**
- Create: `scripts/scorecard-goal-types.sql`

**Step 1: Write the SQL migration**

```sql
-- scorecard-goal-types.sql
-- Adds goal_type to measures, baseline + thresholds to goals
-- Run in Supabase SQL Editor
-- Date: 2026-03-04

BEGIN;

-- 1. Add goal_type to scorecard_measures
ALTER TABLE scorecard_measures
ADD COLUMN IF NOT EXISTS goal_type text NOT NULL DEFAULT 'weekly'
CHECK (goal_type IN ('weekly', 'cumulative', 'point_in_time'));

-- 2. Add baseline_value and threshold columns to scorecard_goals
ALTER TABLE scorecard_goals
ADD COLUMN IF NOT EXISTS baseline_value numeric NOT NULL DEFAULT 0;

ALTER TABLE scorecard_goals
ADD COLUMN IF NOT EXISTS threshold_green integer NOT NULL DEFAULT 90;

ALTER TABLE scorecard_goals
ADD COLUMN IF NOT EXISTS threshold_yellow integer NOT NULL DEFAULT 50;

-- 3. Set goal_type for existing measures based on the rules doc
-- US Team
UPDATE scorecard_measures SET goal_type = 'weekly'
WHERE name IN ('Contacts Created', 'First Time Meetings', 'New Potentials Created', 'Proposals Delivered (#)');

UPDATE scorecard_measures SET goal_type = 'cumulative'
WHERE name IN ('Proposals Delivered ($)', 'New One-Time Deals Booked ($)', 'Recurring Deals Booked ($)');

UPDATE scorecard_measures SET goal_type = 'point_in_time'
WHERE name LIKE 'Quarter-End%';

-- Lead Generation
UPDATE scorecard_measures SET goal_type = 'weekly'
WHERE name IN ('Emails Sent', 'Emails Replied To', 'Calls Made', 'LI Connections', 'Meetings Set', 'Connects');

UPDATE scorecard_measures SET goal_type = 'cumulative'
WHERE name IN ('Number of Lead Conversions', 'Qualified Leads');

COMMIT;
```

**Step 2: Save file and commit**

```bash
git add scripts/scorecard-goal-types.sql
git commit -m "feat: add goal_type, baseline, thresholds migration SQL"
```

**Step 3: Note for admin** -- This SQL must be run manually in Supabase SQL Editor before deploying the UI changes.

---

### Task 2: Update scorecard-utils.ts -- New % to Goal helpers

**Files:**
- Modify: `src/lib/scorecard-utils.ts`

**Step 1: Add new helper functions after the existing `percentToGoal` function (line 104-107)**

Add these new functions:

```typescript
/** Get the color variant for a % to goal value based on configurable thresholds */
export function goalColorVariant(
  pct: number,
  thresholdGreen: number = 90,
  thresholdYellow: number = 50,
): 'success' | 'warning' | 'danger' {
  if (pct * 100 >= thresholdGreen) return 'success'
  if (pct * 100 >= thresholdYellow) return 'warning'
  return 'danger'
}

/** Get all week-ending dates for a quarter */
export function getWeekEndingsForQuarter(
  quarter: string,
  weekEndingDay: string = 'friday',
): string[] {
  const [yearStr, qPart] = quarter.split('-Q')
  const year = parseInt(yearStr)
  const q = parseInt(qPart)
  const startMonth = (q - 1) * 3 // 0-indexed
  const weeks: string[] = []
  for (let m = 0; m < 3; m++) {
    weeks.push(...getWeekEndingsForMonth(year, startMonth + m, weekEndingDay))
  }
  // Deduplicate (month boundaries can overlap)
  return [...new Set(weeks)].sort()
}

/** Determine the current week-ending date (the one currently in progress or most recent) */
export function getCurrentWeekEnding(weekEndingDay: string = 'friday'): string {
  const now = new Date()
  const we = getWeekEnding(now, weekEndingDay)
  return formatDate(we)
}
```

**Step 2: Commit**

```bash
git add src/lib/scorecard-utils.ts
git commit -m "feat: add goalColorVariant, getWeekEndingsForQuarter, getCurrentWeekEnding helpers"
```

---

### Task 3: Update useScorecardGoals hook to return new columns

**Files:**
- Modify: `src/hooks/use-scorecard.ts`

**Step 1: The hook at line 86-106 already does `select('*')` on scorecard_goals, so the new columns (baseline_value, threshold_green, threshold_yellow) will automatically be included. No code change needed for the hook itself.**

**Step 2: Add a new hook to fetch all entries for a quarter (needed for cumulative running totals)**

Add after `useScorecardGoals` (after line 106):

```typescript
export function useScorecardEntriesForQuarter(groupId: string, quarter: string, weekEndingDay: string = 'friday') {
  const supabase = createClient()

  return useSWR(
    groupId && quarter ? `scorecard-entries-quarter-${groupId}-${quarter}` : null,
    async () => {
      const measureIds = await getMeasureIdsForGroup(supabase, groupId)
      if (measureIds.length === 0) return []

      // Get all week endings in this quarter
      const { getWeekEndingsForQuarter } = await import('@/lib/scorecard-utils')
      const allWeeks = getWeekEndingsForQuarter(quarter, weekEndingDay)
      if (allWeeks.length === 0) return []

      const { data, error } = await supabase
        .from('scorecard_entries')
        .select('measure_id, week_ending, value')
        .in('measure_id', measureIds)
        .in('week_ending', allWeeks)

      if (error) throw error
      return data || []
    },
    { refreshInterval: 60000 }
  )
}
```

**Step 3: Commit**

```bash
git add src/hooks/use-scorecard.ts
git commit -m "feat: add useScorecardEntriesForQuarter hook for cumulative totals"
```

---

### Task 4: Update ScorecardGrid -- Three goal type display modes

**Files:**
- Modify: `src/components/scorecard/scorecard-grid.tsx`

This is the largest task. The grid needs to:
1. Pass `goal_type` info through to cell rendering
2. Color cells per-goal-type (weekly = per cell, cumulative = on running total, point_in_time = latest only)
3. Compute running totals for cumulative measures
4. Show latest-only for point_in_time in Total column
5. Lock past cells for point_in_time measures

**Step 1: Add new props and imports**

At line 1-9, update imports:

```typescript
import { formatValue, formatWeekHeader, percentToGoal, goalColorVariant, getCurrentWeekEnding } from '@/lib/scorecard-utils'
```

Add to `ScorecardGridProps` interface (after line 18):

```typescript
  currentWeekEnding?: string
  quarterEntries?: any[] // all entries for the quarter (for cumulative running totals)
  weekEndingDay?: string
```

**Step 2: Add goal metadata maps in the main component**

After `goalIdMap` (line 120-124), add:

```typescript
  // Build goal metadata maps (thresholds, baseline)
  const goalMetaMap = useMemo(() => {
    const map = new Map<string, { baseline: number; thresholdGreen: number; thresholdYellow: number }>()
    goals?.forEach((g: any) => map.set(g.measure_id, {
      baseline: g.baseline_value ?? 0,
      thresholdGreen: g.threshold_green ?? 90,
      thresholdYellow: g.threshold_yellow ?? 50,
    }))
    return map
  }, [goals])

  // Build cumulative running total map (measure_id -> total across all quarter weeks)
  const cumulativeMap = useMemo(() => {
    const map = new Map<string, number>()
    if (!quarterEntries) return map
    quarterEntries.forEach((e: any) => {
      map.set(e.measure_id, (map.get(e.measure_id) || 0) + Number(e.value || 0))
    })
    return map
  }, [quarterEntries])
```

**Step 3: Update getMeasureTotal to handle point_in_time**

Replace the `getMeasureTotal` callback (lines 152-175) with:

```typescript
  const getMeasureTotal = useCallback((measureId: string) => {
    const measure = measureById.get(measureId)
    const goalType = measure?.goal_type || 'weekly'

    // Point-in-time: show latest week's value only (not summed)
    if (goalType === 'point_in_time') {
      // Find the latest week that has data
      for (let i = weekEndings.length - 1; i >= 0; i--) {
        const val = aggregateMap.get(`${measureId}-${weekEndings[i]}`)
        if (val !== undefined && val !== 0) return val
      }
      return 0
    }

    // Cumulative: return running total (baseline + all quarter entries)
    if (goalType === 'cumulative') {
      const meta = goalMetaMap.get(measureId)
      const baseline = meta?.baseline ?? 0
      const runningTotal = cumulativeMap.get(measureId) ?? 0
      return baseline + runningTotal
    }

    // Weekly: sum visible weeks (original behavior)
    const formula = measure?.calculation_formula
    if (formula?.type === 'ratio' && formula.numerator && formula.denominator) {
      const nameMap = sectionNameToId.get(measureId)
      const numId = nameMap?.get(formula.numerator)
      const denId = nameMap?.get(formula.denominator)
      if (numId && denId) {
        let totalNum = 0, totalDen = 0
        weekEndings.forEach((week) => {
          totalNum += aggregateMap.get(`${numId}-${week}`) || 0
          totalDen += aggregateMap.get(`${denId}-${week}`) || 0
        })
        return totalDen > 0 ? totalNum / totalDen : 0
      }
    }
    let total = 0
    weekEndings.forEach((week) => {
      total += aggregateMap.get(`${measureId}-${week}`) || 0
    })
    return total
  }, [weekEndings, aggregateMap, measureById, sectionNameToId, goalMetaMap, cumulativeMap])
```

**Step 4: Pass new props to ScorecardSection**

Add to `ScorecardSectionProps` interface:

```typescript
  goalMetaMap: Map<string, { baseline: number; thresholdGreen: number; thresholdYellow: number }>
  currentWeekEnding?: string
```

Pass them in the JSX where `ScorecardSection` is rendered (around line 199-216).

**Step 5: Update cell rendering in ScorecardSection**

In the measure row rendering (lines 283-387), update:

a) **Cell coloring for weekly measures** -- wrap each weekly cell value in a colored background:

```typescript
// Determine cell background color for weekly goal_type
const goalType = measure.goal_type || 'weekly'
const meta = goalMetaMap.get(measure.id)
const thresholdGreen = meta?.thresholdGreen ?? 90
const thresholdYellow = meta?.thresholdYellow ?? 50

// For weekly: color each cell. For point_in_time: only color if it's the current/latest week
let cellBgClass = ''
if (goal && aggValue > 0) {
  if (goalType === 'weekly') {
    const pct = aggValue / goal
    const variant = goalColorVariant(pct, thresholdGreen, thresholdYellow)
    cellBgClass = variant === 'success' ? 'bg-green-50 dark:bg-green-950/30'
      : variant === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/30'
      : 'bg-red-50 dark:bg-red-950/30'
  }
}
```

b) **Lock point_in_time past cells:**

```typescript
const isPastWeek = currentWeekEnding && week < currentWeekEnding
const isLocked = goalType === 'point_in_time' && isPastWeek
```

Pass `readOnly={readOnly || isLocked}` to `CellEntryPopover` and add a lock icon or grayed style.

c) **% to Goal column** -- use configurable thresholds:

Replace the hardcoded Badge variant (line 378):

```typescript
<Badge
  variant={goalColorVariant(pctToGoal, thresholdGreen, thresholdYellow)}
  className="text-xs"
>
```

d) **Total column** -- for point_in_time, label it differently:

```typescript
<td className="text-right px-3 py-1.5 font-medium">
  {goalType === 'point_in_time'
    ? (total > 0 ? <span className="text-xs text-muted-foreground mr-1">latest:</span> : null)
    : null}
  {goalType === 'cumulative' && total > 0
    ? <span className="text-xs text-muted-foreground mr-1">YTD:</span>
    : null}
  {total > 0 ? formatValue(total, measure.data_type) : '-'}
</td>
```

**Step 6: Commit**

```bash
git add src/components/scorecard/scorecard-grid.tsx
git commit -m "feat: three goal type display modes with per-cell coloring and locking"
```

---

### Task 5: Update Scorecard Page -- Pass new props

**Files:**
- Modify: `src/app/(app)/groups/[groupId]/scorecard/page.tsx`

**Step 1: Import and use the new hook**

At line 8-12, add to imports:

```typescript
import { useScorecardEntriesForQuarter } from '@/hooks/use-scorecard'
import { getCurrentWeekEnding } from '@/lib/scorecard-utils'
```

After the existing hooks (around line 36), add:

```typescript
  const { data: quarterEntries } = useScorecardEntriesForQuarter(groupId, quarterLabel, settings?.week_ending_day)
  const currentWeekEnding = getCurrentWeekEnding(settings?.week_ending_day)
```

**Step 2: Pass to ScorecardGrid** (around line 118-131):

Add these props:

```typescript
  currentWeekEnding={currentWeekEnding}
  quarterEntries={quarterEntries || []}
  weekEndingDay={settings?.week_ending_day}
```

**Step 3: Commit**

```bash
git add "src/app/(app)/groups/[groupId]/scorecard/page.tsx"
git commit -m "feat: pass quarter entries and currentWeekEnding to scorecard grid"
```

---

### Task 6: Update RollupRow -- Use configurable thresholds

**Files:**
- Modify: `src/components/scorecard/rollup-row.tsx`

**Step 1: Update import** (line 6):

```typescript
import { formatValue, percentToGoal, goalColorVariant } from '@/lib/scorecard-utils'
```

**Step 2: Add threshold props to RollupRowProps** (after line 16):

```typescript
  thresholdGreen?: number
  thresholdYellow?: number
```

**Step 3: Update Badge variant** (line 96):

```typescript
variant={goalColorVariant(pctToGoal, thresholdGreen ?? 90, thresholdYellow ?? 50)}
```

**Step 4: Commit**

```bash
git add src/components/scorecard/rollup-row.tsx
git commit -m "feat: configurable thresholds in rollup row"
```

---

### Task 7: Update GoalsSection in Settings -- Add goal_type, baseline, thresholds

**Files:**
- Modify: `src/components/settings/scorecard-tab.tsx`

**Step 1: Update the GoalsSection grid header** (line 262-267):

Change from 4 columns to 7:

```typescript
<div className="grid grid-cols-[1fr_2fr_80px_80px_100px_70px_70px] gap-2 text-xs font-medium text-muted-foreground px-1">
  <span>Section</span>
  <span>Measure</span>
  <span>Type</span>
  <span>Data</span>
  <span>Goal</span>
  <span>Green %</span>
  <span>Yellow %</span>
</div>
```

**Step 2: Update each measure row** (lines 269-289):

Add dropdowns for goal_type and inputs for thresholds + baseline:

```typescript
{sections.flatMap((section: any) =>
  (section.scorecard_measures || []).map((m: any) => {
    const goalRecord = goalByMeasure[m.id]
    return (
      <div
        key={m.id}
        className="grid grid-cols-[1fr_2fr_80px_80px_100px_70px_70px] gap-2 items-center rounded-md border px-3 py-2"
      >
        <span className="text-sm text-muted-foreground">{section.name}</span>
        <span className="text-sm">{m.name}</span>
        <span className="text-xs text-muted-foreground capitalize">{m.goal_type || 'weekly'}</span>
        <span className="text-xs text-muted-foreground capitalize">{m.data_type}</span>
        <Input
          type="number"
          min="0"
          step="1"
          className="h-8 text-sm w-24"
          placeholder="--"
          value={getDisplayValue(m.id)}
          onChange={(e) => handleGoalChange(m.id, e.target.value)}
        />
        <Input
          type="number"
          min="0"
          max="100"
          className="h-7 text-xs w-16"
          placeholder="90"
          value={getThresholdValue(m.id, 'green')}
          onChange={(e) => handleThresholdChange(m.id, 'green', e.target.value)}
        />
        <Input
          type="number"
          min="0"
          max="100"
          className="h-7 text-xs w-16"
          placeholder="50"
          value={getThresholdValue(m.id, 'yellow')}
          onChange={(e) => handleThresholdChange(m.id, 'yellow', e.target.value)}
        />
      </div>
    )
  })
)}
```

**Step 3: Add state and handlers for thresholds and baseline**

In `GoalsSection`, add alongside `editedGoals` state:

```typescript
const [editedThresholds, setEditedThresholds] = useState<Record<string, { green?: string; yellow?: string }>>({})

function getThresholdValue(measureId: string, color: 'green' | 'yellow'): string {
  const edited = editedThresholds[measureId]
  if (edited && edited[color] !== undefined) return edited[color]!
  const existing = goalByMeasure[measureId]
  if (color === 'green') return String(existing?.threshold_green ?? 90)
  return String(existing?.threshold_yellow ?? 50)
}

function handleThresholdChange(measureId: string, color: 'green' | 'yellow', value: string) {
  setEditedThresholds((prev) => ({
    ...prev,
    [measureId]: { ...prev[measureId], [color]: value },
  }))
}
```

**Step 4: Update handleSaveGoals to include thresholds**

In the save loop, when upserting goals, include the threshold values:

```typescript
// When inserting new goal:
await supabase.from('scorecard_goals').insert({
  measure_id: measureId,
  quarter,
  goal_value: goalValue,
  set_by: user.id,
  threshold_green: parseInt(getThresholdValue(measureId, 'green')) || 90,
  threshold_yellow: parseInt(getThresholdValue(measureId, 'yellow')) || 50,
})

// When updating existing goal:
await supabase.from('scorecard_goals').update({
  goal_value: goalValue,
  threshold_green: parseInt(getThresholdValue(measureId, 'green')) || 90,
  threshold_yellow: parseInt(getThresholdValue(measureId, 'yellow')) || 50,
}).eq('id', existing.id)
```

Also save threshold-only changes (where goal value didn't change but thresholds did).

**Step 5: Commit**

```bash
git add src/components/settings/scorecard-tab.tsx
git commit -m "feat: add goal_type display, threshold inputs to Settings goals section"
```

---

### Task 8: Update ZohoSyncSection -- Remove backfill, add current week sync

**Files:**
- Modify: `src/components/settings/scorecard-tab.tsx` (ZohoSyncSection function, lines 610-689)

**Step 1: Replace the ZohoSyncSection function**

Key changes:
- Remove `handleSync(weeks)` parameter -- always sync 1 week
- Change "Sync Last Week" to "Sync Current Week" (syncs in-progress week)
- Remove "Backfill (5 Weeks)" button entirely
- Calculate current week ending (not last completed) for the button

```typescript
function ZohoSyncSection({ groupId }: { groupId: string }) {
  const { data: settings } = useScorecardSettings(groupId)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    setSyncError(null)
    try {
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      }
      const weekEndingDay = settings?.week_ending_day || 'friday'
      const targetDay = dayMap[weekEndingDay.toLowerCase()] ?? 5
      const now = new Date()
      const today = now.getDay()
      // Get the current week's ending date (upcoming or today if it's the target day)
      let daysForward = (targetDay - today + 7) % 7
      if (daysForward === 0) daysForward = 0 // today IS the end day, use today
      const currentWeekEnd = new Date(now)
      currentWeekEnd.setDate(now.getDate() + daysForward)
      const weekEnding = currentWeekEnd.toISOString().slice(0, 10)

      const res = await fetch('/api/zoho/sync-scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, weekEnding, weeks: 1 }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
        toast.success(`Synced ${data.entriesUpserted} entries for current week`)
      } else {
        setSyncError(data.error || 'Sync failed')
        toast.error(data.error || 'Sync failed')
      }
    } catch (err: any) {
      const msg = err?.message || 'Network error during sync'
      setSyncError(msg)
      toast.error(msg)
    }
    setSyncing(false)
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Zoho CRM Sync</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Populate scorecard entries from Zoho CRM data for the current week. Runs automatically every Saturday via cron.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Current Week'}
        </Button>
      </div>
      {syncError && (
        <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Sync Error</p>
          <p className="mt-1">{syncError}</p>
        </div>
      )}
      {result && (
        <div className="rounded border bg-muted/50 p-3 text-sm space-y-1">
          <p>Entries synced: {result.entriesUpserted}</p>
          {result.unmappedZohoUsers?.length > 0 && (
            <p className="text-amber-600">Unmapped Zoho users: {result.unmappedZohoUsers.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/settings/scorecard-tab.tsx
git commit -m "feat: simplify Zoho sync to current-week only, remove backfill button"
```

---

### Task 9: Update zoho-sync.ts -- Remove multi-week support, enforce weeks=1

**Files:**
- Modify: `src/lib/zoho-sync.ts`

**Step 1: Simplify the function signature**

The `weeks` parameter stays for backward compatibility with the API route, but clamp it to max 1 in the UI paths. The cron already passes `weeks: 1`. No functional change needed in zoho-sync.ts itself -- the simplification is in the UI (Task 8) and we keep the function flexible.

**Step 2: No code change needed.** The API route still accepts `weeks` for edge cases but the UI only sends 1.

---

### Task 10: Update CellEntryPopover -- Support locked cells

**Files:**
- Modify: `src/components/scorecard/cell-entry-popover.tsx`

**Step 1: When `readOnly` is true (passed from grid for locked point_in_time cells), the popover already shows values as read-only (line 145-165). Add a visual indicator.**

After the week ending line (line 128), add when readOnly:

```typescript
{readOnly && (
  <p className="text-xs text-amber-600">This cell is locked (point-in-time snapshot).</p>
)}
```

**Step 2: Commit**

```bash
git add src/components/scorecard/cell-entry-popover.tsx
git commit -m "feat: show lock message in popover for point-in-time past cells"
```

---

### Task 11: Build verification

**Step 1: Run build**

```bash
cd eos-app && npm run build
```

Expected: Build succeeds with no type errors related to our changes.

**Step 2: Fix any build errors, then commit fixes.**

---

### Task 12: Final commit and summary

**Step 1: Review all changes**

```bash
git diff --stat HEAD~10
```

**Step 2: Verify the following checklist:**

- [ ] SQL migration file exists at `scripts/scorecard-goal-types.sql`
- [ ] `scorecard-utils.ts` has `goalColorVariant`, `getWeekEndingsForQuarter`, `getCurrentWeekEnding`
- [ ] `use-scorecard.ts` has `useScorecardEntriesForQuarter` hook
- [ ] `scorecard-grid.tsx` handles weekly/cumulative/point_in_time display
- [ ] `scorecard-grid.tsx` locks point_in_time past cells
- [ ] `scorecard-grid.tsx` colors cells per goal_type with configurable thresholds
- [ ] `rollup-row.tsx` uses configurable thresholds
- [ ] `scorecard-tab.tsx` GoalsSection shows goal_type, threshold inputs
- [ ] `scorecard-tab.tsx` ZohoSyncSection has no backfill button
- [ ] `cell-entry-popover.tsx` shows lock message for read-only cells
- [ ] Build passes

**Step 3: Note for admin**

Run `scripts/scorecard-goal-types.sql` in Supabase SQL Editor before or after deploy. The UI will use defaults (goal_type='weekly', thresholds 90/50) until the migration runs, so deploy order is flexible.
