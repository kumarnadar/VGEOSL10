# Scorecard Data Entry Flow - Design Document

**Date:** 2026-02-25
**Status:** Approved

## Problem

The scorecard grid currently has no way for individual team members to enter their weekly metrics. Each cell shows a single value with inline editing, but the requirement is that each person enters their own numbers and the grid displays aggregated totals.

## Design

### Data Model

No schema changes. The existing `scorecard_entries` table (user_id, measure_id, week_ending, value) already supports per-user entries. Changes are purely in how the UI reads and writes data.

### Grid Display

- Each cell shows the **sum** of all users' entries for that measure+week
- Empty cells default to **0** (not blank) for count/currency measures
- Zero-only cells show "0" in muted text
- Inline cell editing is removed; clicking a cell opens a popover

### Cell Entry Popover

- **Trigger:** Click any data cell (not goal/total/% columns)
- **Contents:** Measure name + week ending header, one row per group member
- **Current user's row:** Editable input field, auto-focused
- **Other users' rows:** Read-only, greyed out
- **Footer:** Running total of all entries
- **Auto-save:** On blur/close, no save button
- **Entry behavior:**
  - Empty/0 = no DB row created (keeps table clean)
  - Non-zero upserts a `scorecard_entries` row for user+measure+week
  - Clearing a value back to 0 deletes the DB row
- **Permissions:** Each user edits only their own entry (RLS enforced). Read-only mode for L10 meeting review shows all values without edit capability.

### Data Aggregation

Two maps built from the entries array:
- `aggregateMap` (measure_id-week_ending -> summed value) for grid cell display
- `userEntryMap` (measure_id-week_ending-user_id -> entry) for popover individual values

### Group Members

New `useGroupMembers(groupId)` hook fetches all group members with profiles for popover rows.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/use-group-members.ts` | NEW - SWR hook for group members |
| `src/components/scorecard/cell-entry-popover.tsx` | NEW - popover with per-user entry rows |
| `src/components/scorecard/scorecard-grid.tsx` | Replace inline editing with popover, aggregateMap for display, default 0 |
| `src/components/scorecard/meeting-scorecard-review.tsx` | Pass readOnly to popover |

No database changes. No new SQL scripts.
