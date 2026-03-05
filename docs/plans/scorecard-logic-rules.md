# Scorecard Goals & Sync Redesign

**Date:** 2026-03-04
**Status:** DRAFT - Pending team review
**Author:** Kumar + Claude

---

## Summary

Redesign scorecard goal tracking to support three distinct measure types (weekly, cumulative, point-in-time), add admin-configurable color thresholds per measure, introduce baseline values for cumulative tracking, lock point-in-time cells after week closes, and simplify Zoho sync to current-week only.

---

## Measure Types

Each scorecard measure has a `goal_type` that determines how % to Goal is calculated and how cells are displayed.

| Goal Type | Meaning | % to Goal Formula | Total Column | Cell Lock |
|-----------|---------|-------------------|-------------|-----------|
| `weekly` | Hit a target every week | `week_value / weekly_goal` | Sum of visible weeks (informational only) | Never locked |
| `cumulative` | Build toward a quarterly/yearly total | `(baseline + sum_all_weeks_in_period) / period_goal` | Running total from period start | Never locked (corrections allowed) |
| `point_in_time` | Snapshot -- latest value is "the" number | `latest_week_value / goal` | Show latest week only (not summed) | Locked after week closes |

---

## Color Threshold Rules

Thresholds are **admin-configurable per measure** when setting up goals in Settings > Scorecard.

**Default thresholds:**

| Color | Condition | Meaning |
|-------|-----------|---------|
| Green | >= 90% of goal | On track |
| Yellow | >= 50% and < 90% of goal | Needs attention |
| Red | < 50% of goal | Off track |

**Where color applies:**

| Goal Type | What gets colored |
|-----------|-------------------|
| `weekly` | Each individual week cell independently |
| `cumulative` | The running total / % to Goal column |
| `point_in_time` | The most recent week's cell only |

---

## US Team Section -- Measure Rules

### 1. Contacts Created
- **Data type:** count
- **Source:** Zoho CRM sync (`Contacts` module, `Created_Time` filter)
- **Goal type:** `weekly`
- **Goal meaning:** Target number of new contacts to create each week
- **Zoho query:** `Created_Time:between:{week_start},{week_end}`, grouped by `Created_By`
- **% to Goal:** Each week: `week_value / weekly_goal`
- **Cell color:** Green/yellow/red per cell based on that week's % to goal
- **Total column:** Sum of visible weeks (informational)
- **Backfill safe:** Yes (`Created_Time` is immutable)
- **Editable:** Yes (manual override sets `source='manual'`, next sync overwrites back to `source='zoho'`)

### 2. First Time Meetings
- **Data type:** count
- **Source:** Zoho CRM sync (`Events` module, `Start_DateTime` + `First_Time_Meeting=true`)
- **Goal type:** `weekly`
- **Goal meaning:** Target number of first-time meetings held each week
- **Zoho query:** `(First_Time_Meeting:equals:true)and(Start_DateTime:between:{week_start},{week_end})`, grouped by `Created_By`
- **% to Goal:** Each week: `week_value / weekly_goal`
- **Cell color:** Green/yellow/red per cell
- **Total column:** Sum of visible weeks (informational)
- **Backfill safe:** Yes (`Start_DateTime` is event-scheduled, doesn't change)
- **Editable:** Yes (same override/sync behavior as Contacts Created)

### 3. New Potentials Created
- **Data type:** count
- **Source:** Zoho CRM sync (`Deals` module, `Created_Time` filter)
- **Goal type:** `weekly`
- **Goal meaning:** Target number of new deals/potentials created each week
- **Zoho query:** `Created_Time:between:{week_start},{week_end}`, grouped by `Created_By`
- **% to Goal:** Each week: `week_value / weekly_goal`
- **Cell color:** Green/yellow/red per cell
- **Total column:** Sum of visible weeks (informational)
- **Backfill safe:** Yes (`Created_Time` is immutable)
- **Editable:** Yes

### 4. Proposals Delivered (#)
- **Data type:** count
- **Source:** Zoho CRM sync (`Deals` module, stage = "Prepare Proposal" or "Presenting Proposal", `Modified_Time` filter)
- **Goal type:** `weekly`
- **Goal meaning:** Target number of proposals delivered each week
- **Zoho query:** `((Stage:equals:Prepare Proposal)or(Stage:equals:Presenting Proposal))and(Modified_Time:between:{week_start},{week_end})`, grouped by `Owner`
- **% to Goal:** Each week: `week_value / weekly_goal`
- **Cell color:** Green/yellow/red per cell
- **Total column:** Sum of visible weeks (informational)
- **Backfill safe:** NO (`Modified_Time` changes when deal is updated later -- only reliable for current week)
- **Editable:** Yes
- **Note:** `Modified_Time` is a proxy for "entered proposal stage this week." Acceptable for current-week sync but unreliable for historical queries.

### 5. Proposals Delivered ($)
- **Data type:** currency
- **Source:** Zoho CRM sync (same query as #4, but summing `Deal.Amount` instead of counting)
- **Goal type:** `cumulative`
- **Goal meaning:** Total dollar value of proposals delivered this quarter
- **Zoho query:** Same as #4, summing `Amount` per `Owner`
- **% to Goal:** `(baseline + sum_of_all_weeks_in_quarter) / quarterly_goal`
- **Cell color:** Color on the % to Goal column (running total vs. target)
- **Total column:** Running total = baseline + sum of all weeks from quarter start
- **Backfill safe:** NO (same `Modified_Time` limitation as #4)
- **Editable:** Yes (corrections to past weeks allowed)
- **Baseline:** Admin can set a starting value if tracking started mid-quarter

### 6. New One-Time Deals Booked ($)
- **Data type:** currency
- **Source:** Manual entry
- **Goal type:** `cumulative`
- **Goal meaning:** Total dollar value of one-time deals closed this quarter
- **% to Goal:** `(baseline + sum_of_all_weeks_in_quarter) / quarterly_goal`
- **Cell color:** Color on the % to Goal column
- **Total column:** Running total from quarter start
- **Editable:** Yes (user enters deal value in the week it closed)
- **Baseline:** Admin can set a starting value

### 7. Recurring Deals Booked ($) (US only)
- **Data type:** currency
- **Source:** Manual entry
- **Goal type:** `cumulative`
- **Goal meaning:** Total dollar value of recurring deals closed this quarter
- **% to Goal:** `(baseline + sum_of_all_weeks_in_quarter) / quarterly_goal`
- **Cell color:** Color on the % to Goal column
- **Total column:** Running total from quarter start
- **Editable:** Yes
- **Baseline:** Admin can set a starting value

### 8. Quarter-End One-Time Weighted Forecast ($)
- **Data type:** currency
- **Source:** Zoho CRM (calculated -- formula TBD by team)
- **Goal type:** `point_in_time`
- **Goal meaning:** Pipeline forecast should be at target value
- **Planned formula:** Sum of (Deal.Amount x Stage.Probability) for all open one-time deals. Stage probability mapping to be defined by team.
- **% to Goal:** `latest_week_value / goal`
- **Cell color:** Only the most recent week is colored
- **Total column:** Shows latest week's value (NOT summed across weeks)
- **Editable:** Current week only. Past weeks are LOCKED after week closes.
- **Lock reason:** These are point-in-time snapshots. Editing past weeks destroys the historical trend of how the pipeline evolved week over week.
- **Note:** Until Zoho formula is defined, this remains manual entry with point-in-time locking.

### 9. Quarter-End Recurring Weighted Forecast ($) (US only)
- **Data type:** currency
- **Source:** Zoho CRM (calculated -- formula TBD by team)
- **Goal type:** `point_in_time`
- **Goal meaning:** Recurring pipeline forecast should be at target value
- **Planned formula:** Sum of (Deal.Amount x Stage.Probability) for all open recurring deals. Stage probability mapping to be defined by team.
- **% to Goal:** `latest_week_value / goal`
- **Cell color:** Only the most recent week is colored
- **Total column:** Shows latest week's value (NOT summed)
- **Editable:** Current week only. Past weeks LOCKED.
- **Note:** Until Zoho formula is defined, this remains manual entry with point-in-time locking.

### 10. Quarter-End Bookings Forecast
- **Data type:** currency
- **Source:** Calculated (`is_calculated: true`)
- **Goal type:** `point_in_time`
- **Calculation:** Sum of #8 + #9 (same section)
- **% to Goal:** Computed from calculated value vs. goal
- **Cell color:** Only the most recent week
- **Total column:** Shows latest week's calculated value
- **Editable:** No (auto-calculated)

---

## India Team Section -- Measure Rules

Same as US Team with these differences:

| # | Measure | Difference from US |
|---|---------|-------------------|
| 1-5 | Contacts, Meetings, Potentials, Proposals (#), Proposals ($) | Same rules, different goals. Routed by `profiles.team_region = 'India'`. |
| 6 | New One-Time Deals Booked ($) | Same as US #6 |
| 7 | QE One-Time Weighted Forecast ($) | Same as US #8 (no recurring line for India) |
| 8 | QE Bookings Forecast | Calculated: sum of India #7 only (no recurring component) |

**India does NOT have:** Recurring Deals Booked ($), QE Recurring Weighted Forecast ($)

---

## Lead Generation Section -- Measure Rules

### 1. Emails Sent
- **Data type:** count
- **Source:** Manual entry
- **Goal type:** `weekly`
- **Goal meaning:** Target emails sent per week
- **% to Goal:** `week_value / weekly_goal`
- **Cell color:** Per cell
- **Editable:** Yes

### 2. Emails Replied To
- **Data type:** count
- **Source:** Manual entry
- **Goal type:** `weekly`
- **Rules:** Same pattern as Emails Sent

### 3. Calls Made
- **Data type:** count
- **Source:** Manual entry
- **Goal type:** `weekly`
- **Rules:** Same pattern

### 4. LI Connections
- **Data type:** count
- **Source:** Manual entry
- **Goal type:** `weekly`
- **Rules:** Same pattern

### 5. Meetings Set
- **Data type:** count
- **Source:** Manual entry
- **Goal type:** `weekly`
- **Rules:** Same pattern

### 6. Connects
- **Data type:** count
- **Source:** Manual entry
- **Goal type:** `weekly`
- **Rules:** Same pattern

### 7. Number of Lead Conversions
- **Data type:** count
- **Source:** Manual entry
- **Goal type:** `cumulative`
- **Goal meaning:** Total conversions this quarter
- **% to Goal:** `(baseline + sum_of_all_weeks_in_quarter) / quarterly_goal`
- **Cell color:** On % to Goal column
- **Total column:** Running total from quarter start
- **Editable:** Yes
- **Baseline:** Admin can set starting value

### 8. Qualified Leads
- **Data type:** count
- **Source:** Manual entry
- **Goal type:** `cumulative`
- **Goal meaning:** Total qualified leads this quarter
- **% to Goal:** Same as Lead Conversions
- **Cell color:** On % to Goal column
- **Total column:** Running total from quarter start
- **Editable:** Yes
- **Baseline:** Admin can set starting value

---

## Zoho Sync Changes

### Current Week Only (no backfill)
- **Cron job** (Saturday 6am UTC): Syncs only the most recently completed week
- **"Sync Current Week" button:** Syncs the in-progress week (partial data). Can be run anytime.
- **Backfill button:** REMOVED entirely
- **One-time catch-up:** For `Created_Time` metrics only (Contacts, Meetings, New Potentials), a one-time backfill script can be run manually if needed. Not exposed in UI.

### Sync behavior per measure
| Measure | Syncs from Zoho | Backfill safe |
|---------|----------------|---------------|
| Contacts Created | Yes | Yes |
| First Time Meetings | Yes | Yes |
| New Potentials Created | Yes | Yes |
| Proposals Delivered (#) | Yes | No (current week only) |
| Proposals Delivered ($) | Yes | No (current week only) |
| QE Weighted Forecasts | Future (formula TBD) | N/A (point-in-time) |
| All others | No (manual) | N/A |

---

## Database Changes

### 1. Add `goal_type` to `scorecard_measures`
```sql
ALTER TABLE scorecard_measures
ADD COLUMN goal_type text NOT NULL DEFAULT 'weekly'
CHECK (goal_type IN ('weekly', 'cumulative', 'point_in_time'));
```

### 2. Add `baseline_value` to `scorecard_goals`
```sql
ALTER TABLE scorecard_goals
ADD COLUMN baseline_value numeric NOT NULL DEFAULT 0;
```

### 3. Add threshold columns to `scorecard_goals`
```sql
ALTER TABLE scorecard_goals
ADD COLUMN threshold_green integer NOT NULL DEFAULT 90,
ADD COLUMN threshold_yellow integer NOT NULL DEFAULT 50;
```
- Green: >= `threshold_green`%
- Yellow: >= `threshold_yellow`% and < `threshold_green`%
- Red: < `threshold_yellow`%

### 4. Add `is_locked` logic (no DB column needed)
Lock is computed client-side:
- If `measure.goal_type = 'point_in_time'` AND `week_ending < current_week_ending` => cell is read-only
- No database column required -- it's a display rule

---

## Settings UI Changes

### Goal Configuration (Settings > Scorecard > Quarterly Goals)

For each measure, admin sees:

| Field | Description |
|-------|-------------|
| Goal Value | The target number (weekly target or quarterly total depending on goal_type) |
| Goal Type | Dropdown: Weekly / Cumulative / Point-in-Time (set once per measure, rarely changes) |
| Baseline | Starting value for cumulative metrics (default 0). Only shown when goal_type = cumulative. |
| Green Threshold | % at which cell turns green (default 90) |
| Yellow Threshold | % at which cell turns yellow (default 50). Below this = red. |

### Grid Display Changes

| Goal Type | Cell Behavior | Total Column | % to Goal Column |
|-----------|--------------|-------------|-----------------|
| `weekly` | Each cell colored independently | Sum of visible weeks | Average % across visible weeks OR latest week |
| `cumulative` | Cells show weekly increment (no color per cell) | Running total = baseline + sum from quarter start | `running_total / quarterly_goal` with color |
| `point_in_time` | Latest week colored, past weeks grayed + locked | Latest week's value | `latest_value / goal` with color |

---

## Open Items for Team Review

1. **Weekly goal numbers:** Kumar to update goals to whole numbers (e.g., Contacts Created = 15/week, not 15.08)
2. **Forecast formula:** Team to define stage probability mapping for QE Weighted Forecast calculation from Zoho deals
3. **Lead Gen goals:** Confirm whether seed values (1760, 176, etc.) are quarterly totals to be divided by 13 for weekly targets
4. **India Recurring:** Confirm India team has no recurring deals line (currently absent from seed data)
5. **Baseline values:** Kumar to provide starting numbers for cumulative metrics if tracking started mid-quarter
6. **Threshold defaults:** Team to confirm 90/50 defaults work or if specific measures need different thresholds

---

## Implementation Sequence

1. Database migration (add goal_type, baseline_value, thresholds)
2. Update goal seed data with correct goal_types per measure
3. Settings UI: add goal_type, baseline, threshold fields to goal editor
4. Grid: implement three display modes (weekly/cumulative/point_in_time)
5. Grid: cell locking for point-in-time past weeks
6. Grid: per-cell coloring with configurable thresholds
7. Zoho sync: remove backfill, keep current-week-only sync
8. Zoho sync: add one-time backfill script for Created_Time metrics (CLI only)
