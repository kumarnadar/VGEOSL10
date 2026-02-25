# Scorecard Data Entry Flow - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable individual team members to enter their weekly scorecard metrics via cell popovers, with automatic aggregation in the grid display.

**Architecture:** Replace inline cell editing in ScorecardGrid with a Popover component that shows all group members. Each user edits only their own row. The grid displays aggregated sums. Auto-save on blur, default to zero.

**Tech Stack:** React, shadcn Popover (already installed), SWR, Supabase client SDK, existing RLS policies.

---

### Task 1: Create useGroupMembers Hook

**Files:**
- Create: `src/hooks/use-group-members.ts`

**Step 1: Create the hook**

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'

export function useGroupMembers(groupId: string) {
  const supabase = createClient()

  return useSWR(
    groupId ? `group-members-${groupId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id, role_in_group, user:profiles!group_members_user_id_fkey(id, full_name)')
        .eq('group_id', groupId)
        .order('created_at')

      if (error) throw error
      return data || []
    },
    { refreshInterval: 60000 }
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors related to use-group-members.ts

**Step 3: Commit**

```bash
git add src/hooks/use-group-members.ts
git commit -m "feat: add useGroupMembers hook for scorecard popover"
```

---

### Task 2: Create CellEntryPopover Component

**Files:**
- Create: `src/components/scorecard/cell-entry-popover.tsx`

**Step 1: Create the popover component**

This component renders inside each grid cell as a Popover trigger+content. It:
- Shows all group members with their entry values
- Lets the current user edit their own row (auto-focused input)
- Shows other users' values as read-only greyed text
- Displays a running total at the bottom
- Auto-saves on blur (upsert if non-zero, delete if zero/empty)

```typescript
'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatValue, parseInputValue, formatWeekHeader } from '@/lib/scorecard-utils'
import { mutate } from 'swr'

interface CellEntryPopoverProps {
  measureId: string
  measureName: string
  dataType: string
  weekEnding: string
  groupId: string
  weekEndings: string[] // for SWR cache key
  members: { id: string; user_id: string; user: { id: string; full_name: string } }[]
  userEntryMap: Map<string, any> // key: measureId-weekEnding-userId
  aggregateValue: number
  readOnly?: boolean
  children: React.ReactNode // the cell display content (trigger)
}

export function CellEntryPopover({
  measureId,
  measureName,
  dataType,
  weekEnding,
  groupId,
  weekEndings,
  members,
  userEntryMap,
  aggregateValue,
  readOnly = false,
  children,
}: CellEntryPopoverProps) {
  const { user } = useUser()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [localValue, setLocalValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // When popover opens, set local value to current user's entry
  useEffect(() => {
    if (open && user) {
      const entry = userEntryMap.get(`${measureId}-${weekEnding}-${user.id}`)
      setLocalValue(entry?.value != null ? String(entry.value) : '')
    }
  }, [open, user, measureId, weekEnding, userEntryMap])

  // Auto-focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to let popover render
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Compute running total from all members
  const total = useMemo(() => {
    let sum = 0
    members.forEach((m) => {
      const entry = userEntryMap.get(`${measureId}-${weekEnding}-${m.user_id}`)
      if (entry?.value != null) sum += Number(entry.value)
    })
    // If current user has a local edit, adjust total
    if (user) {
      const currentEntry = userEntryMap.get(`${measureId}-${weekEnding}-${user.id}`)
      const currentDbValue = currentEntry?.value != null ? Number(currentEntry.value) : 0
      const localParsed = parseInputValue(localValue, dataType) ?? 0
      sum = sum - currentDbValue + localParsed
    }
    return sum
  }, [members, userEntryMap, measureId, weekEnding, user, localValue, dataType])

  // Save on blur or popover close
  const saveEntry = useCallback(async () => {
    if (!user || readOnly) return
    const parsed = parseInputValue(localValue, dataType)
    const existing = userEntryMap.get(`${measureId}-${weekEnding}-${user.id}`)

    if (parsed === null || parsed === 0) {
      // Delete entry if it exists
      if (existing?.id) {
        await supabase.from('scorecard_entries').delete().eq('id', existing.id)
      }
    } else if (existing?.id) {
      // Update existing
      if (parsed !== Number(existing.value)) {
        await supabase
          .from('scorecard_entries')
          .update({ value: parsed, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      }
    } else {
      // Insert new
      await supabase.from('scorecard_entries').insert({
        measure_id: measureId,
        user_id: user.id,
        week_ending: weekEnding,
        value: parsed,
      })
    }

    mutate(`scorecard-entries-${groupId}-${weekEndings.join(',')}`)
  }, [user, readOnly, localValue, dataType, measureId, weekEnding, supabase, groupId, weekEndings, userEntryMap])

  // Save when popover closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && open) {
      saveEntry()
    }
    setOpen(newOpen)
  }, [open, saveEntry])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">{measureName}</p>
            <p className="text-xs text-muted-foreground">Week ending {formatWeekHeader(weekEnding)}</p>
          </div>
          <Separator />
          <div className="space-y-1.5">
            {members.map((member) => {
              const isCurrentUser = user?.id === member.user_id
              const entry = userEntryMap.get(`${measureId}-${weekEnding}-${member.user_id}`)
              const memberValue = entry?.value != null ? Number(entry.value) : 0

              return (
                <div key={member.user_id} className="flex items-center justify-between gap-2">
                  <span className={cn(
                    'text-sm truncate',
                    !isCurrentUser && 'text-muted-foreground'
                  )}>
                    {member.user?.full_name || 'Unknown'}
                  </span>
                  {isCurrentUser && !readOnly ? (
                    <Input
                      ref={inputRef}
                      type="text"
                      value={localValue}
                      onChange={(e) => setLocalValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveEntry()
                          setOpen(false)
                        }
                      }}
                      className="w-20 h-7 text-right text-sm"
                      placeholder="0"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground w-20 text-right">
                      {memberValue > 0 ? formatValue(memberValue, dataType) : '0'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-sm font-medium w-20 text-right">
              {formatValue(total, dataType)}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

**Step 2: Export from index**

Add to `src/components/scorecard/index.ts`:
```typescript
export { CellEntryPopover } from './cell-entry-popover'
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/scorecard/cell-entry-popover.tsx src/components/scorecard/index.ts
git commit -m "feat: add CellEntryPopover for per-user metric entry"
```

---

### Task 3: Refactor ScorecardGrid to Use Aggregation and Popover

**Files:**
- Modify: `src/components/scorecard/scorecard-grid.tsx`

**Context:** This is the biggest change. We need to:
1. Remove all inline editing state and handlers (`editingCell`, `editValue`, `inputRef`, `saveEntry`, `handleCellClick`, `handleKeyDown`, `handleBlur`)
2. Build two new maps: `aggregateMap` and `userEntryMap`
3. Replace cell rendering to use `CellEntryPopover` instead of inline input
4. Show 0 (muted) instead of blank for empty cells
5. Pass `members` from a new `useGroupMembers` call

**Step 1: Add imports and group members hook**

At top of `scorecard-grid.tsx`, add imports:
```typescript
import { useGroupMembers } from '@/hooks/use-group-members'
import { CellEntryPopover } from './cell-entry-popover'
```

Add inside `ScorecardGrid` function, after existing hooks:
```typescript
const { data: members } = useGroupMembers(groupId)
```

**Step 2: Replace entryMap with aggregateMap and userEntryMap**

Remove the existing `entryMap` block (lines 57-61). Replace with:

```typescript
// Build per-user entry map and aggregate map
const userEntryMap = useMemo(() => {
  const map = new Map<string, any>()
  entries?.forEach((e: any) => {
    map.set(`${e.measure_id}-${e.week_ending}-${e.user_id}`, e)
  })
  return map
}, [entries])

const aggregateMap = useMemo(() => {
  const map = new Map<string, number>()
  entries?.forEach((e: any) => {
    const key = `${e.measure_id}-${e.week_ending}`
    map.set(key, (map.get(key) || 0) + Number(e.value || 0))
  })
  return map
}, [entries])
```

**Step 3: Remove inline editing state and handlers**

Remove these from the ScorecardGrid component:
- `const [editingCell, setEditingCell] = useState<EditingCell | null>(null)`
- `const [editValue, setEditValue] = useState('')`
- `const inputRef = useRef<HTMLInputElement>(null)`
- The `useEffect` for focusing input (lines 49-54)
- The `EditingCell` interface (lines 25-28)
- The `saveEntry` callback
- The `handleCellClick` callback
- The `handleKeyDown` callback
- The `handleBlur` callback

**Step 4: Update getMeasureTotal to use aggregateMap**

Replace the existing `getMeasureTotal`:
```typescript
const getMeasureTotal = useCallback((measureId: string) => {
  let total = 0
  weekEndings.forEach((week) => {
    total += aggregateMap.get(`${measureId}-${week}`) || 0
  })
  return total
}, [weekEndings, aggregateMap])
```

**Step 5: Update computeRollupTotals calls to use aggregateMap**

The `computeRollupTotals` function in `rollup-row.tsx` takes `entryMap` which used a `measure_id-week_ending` key. The new `aggregateMap` uses the same key format and stores numbers. We need to check if `computeRollupTotals` expects entry objects or numbers.

Check `rollup-row.tsx` -- if it accesses `.value` on entries, we need a thin wrapper. If it just sums values, it may need adjusting. Create a compatibility wrapper:

```typescript
// Build a compatibility map for rollup calculations (key -> {value: number})
const rollupEntryMap = useMemo(() => {
  const map = new Map<string, any>()
  aggregateMap.forEach((value, key) => {
    map.set(key, { value })
  })
  return map
}, [aggregateMap])
```

Pass `rollupEntryMap` instead of `entryMap` to `RollupRow` and `ScorecardSection`.

**Step 6: Update ScorecardSection props and cell rendering**

Add new props to `ScorecardSectionProps`:
```typescript
members: any[]
userEntryMap: Map<string, any>
aggregateMap: Map<string, number>
weekEndingsArray: string[] // for SWR cache key in popover
```

Remove from props: `editingCell`, `editValue`, `inputRef`, `onCellClick`, `onKeyDown`, `onBlur`, `onEditValueChange`

In the ScorecardGrid JSX, pass new props to ScorecardSection:
```typescript
members={members || []}
userEntryMap={userEntryMap}
aggregateMap={aggregateMap}
weekEndingsArray={weekEndings}
```

**Step 7: Replace cell rendering in ScorecardSection**

For each weekly cell, replace the inline editing logic with CellEntryPopover:

```typescript
{weekEndings.map((week) => {
  const aggValue = aggregateMap.get(`${measure.id}-${week}`) || 0

  if (measure.is_calculated) {
    return (
      <td key={week} className="text-right px-3 py-1.5 font-medium bg-muted/20">
        {aggValue > 0 ? formatValue(aggValue, measure.data_type) : '-'}
      </td>
    )
  }

  return (
    <td key={week} className="text-right px-3 py-1.5 relative">
      <CellEntryPopover
        measureId={measure.id}
        measureName={measure.name}
        dataType={measure.data_type}
        weekEnding={week}
        groupId={groupId}
        weekEndings={weekEndingsArray}
        members={members}
        userEntryMap={userEntryMap}
        aggregateValue={aggValue}
        readOnly={readOnly}
      >
        <button
          className={cn(
            'w-full text-right cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5',
            aggValue === 0 && 'text-muted-foreground'
          )}
        >
          {formatValue(aggValue, measure.data_type)}
        </button>
      </CellEntryPopover>
    </td>
  )
})}
```

**Step 8: Pass groupId and readOnly through ScorecardSection**

Add `groupId` and `readOnly` to `ScorecardSectionProps` and pass them through from parent.

**Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 10: Verify build**

Run: `npx next build 2>&1 | tail -30`
Expected: All scorecard routes compile successfully

**Step 11: Commit**

```bash
git add src/components/scorecard/scorecard-grid.tsx
git commit -m "feat: replace inline editing with popover entry and auto-aggregation"
```

---

### Task 4: Update Meeting Scorecard Review

**Files:**
- Modify: `src/components/scorecard/meeting-scorecard-review.tsx`

**Step 1: Verify readOnly prop passes through**

The `MeetingScorecardReview` already passes `readOnly={true}` to `ScorecardGrid`. Since we're now passing `readOnly` through to `CellEntryPopover`, the popover will show all values as read-only in the meeting review. No code changes should be needed here.

Verify by reading the component and confirming `readOnly={true}` is set on `ScorecardGrid`.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

**Step 3: Commit (if any changes needed)**

```bash
git add src/components/scorecard/meeting-scorecard-review.tsx
git commit -m "fix: ensure readOnly passes through to cell popovers in meeting review"
```

---

### Task 5: Final Verification and Build

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: Clean, no errors

**Step 2: Production build**

Run: `npx next build 2>&1 | tail -30`
Expected: All routes compile, including `/groups/[groupId]/scorecard` and subpages

**Step 3: Commit any remaining fixes**

If any type errors or build issues arose, fix and commit.

**Step 4: Push**

```bash
git push
```
