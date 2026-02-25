'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { formatValue, parseInputValue } from '@/lib/scorecard-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mutate } from 'swr'

interface GoalEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalId: string | null
  measureId: string
  measureName: string
  dataType: string
  quarter: string
  currentValue: number | null
  groupId: string
}

export function GoalEditor({
  open,
  onOpenChange,
  goalId,
  measureId,
  measureName,
  dataType,
  quarter,
  currentValue,
  groupId,
}: GoalEditorProps) {
  const { user } = useUser()
  const supabase = createClient()
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (!user) return
    const parsed = parseInputValue(newValue, dataType)
    if (parsed === null) return

    setSaving(true)

    if (goalId) {
      // Update existing goal (trigger auto-logs the change)
      await supabase
        .from('scorecard_goals')
        .update({ goal_value: parsed })
        .eq('id', goalId)

      // Manually insert reason into change log if provided
      if (reason.trim()) {
        // Get the most recent log entry for this goal to add reason
        const { data: logs } = await supabase
          .from('goal_change_log')
          .select('id')
          .eq('goal_id', goalId)
          .order('changed_at', { ascending: false })
          .limit(1)

        if (logs && logs.length > 0) {
          await supabase
            .from('goal_change_log')
            .update({ reason: reason.trim() })
            .eq('id', logs[0].id)
        }
      }
    } else {
      // Create new goal
      await supabase
        .from('scorecard_goals')
        .insert({
          measure_id: measureId,
          quarter,
          goal_value: parsed,
          set_by: user.id,
        })
    }

    setSaving(false)
    setNewValue('')
    setReason('')
    onOpenChange(false)
    mutate(`scorecard-goals-${groupId}-${quarter}`)
  }, [goalId, measureId, quarter, newValue, reason, dataType, user, supabase, groupId, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goalId ? 'Edit' : 'Set'} Goal</DialogTitle>
          <DialogDescription>
            {measureName} &middot; {quarter}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {currentValue != null && (
            <div className="text-sm">
              <span className="text-muted-foreground">Current goal: </span>
              <span className="font-medium">{formatValue(currentValue, dataType)}</span>
            </div>
          )}

          <div>
            <Label>New Goal Value</Label>
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={dataType === 'currency' ? '$0' : '0'}
              autoFocus
            />
          </div>

          {goalId && (
            <div>
              <Label>Reason for Change</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional: why is the goal changing?"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !newValue.trim()}>
              {saving ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
