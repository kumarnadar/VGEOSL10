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
  weekEndings: string[]
  members: { id: string; user_id: string; user: { id: string; full_name: string } }[]
  userEntryMap: Map<string, any>
  aggregateValue: number
  readOnly?: boolean
  children: React.ReactNode
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
