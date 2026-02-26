'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { useMeetingAgenda, DEFAULT_AGENDA_STEPS } from '@/hooks/use-meeting-agenda'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'

export function MeetingsTab({ groups }: { groups: { id: string; name: string }[] }) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '')

  if (groups.length === 0) {
    return <p className="text-muted-foreground">No groups available.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label htmlFor="meetings-group" className="shrink-0 font-semibold">Group:</Label>
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-64" id="meetings-group">
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && <AgendaConfigSection groupId={selectedGroupId} />}
    </div>
  )
}

function AgendaConfigSection({ groupId }: { groupId: string }) {
  const supabase = createClient()
  const { data: steps, error } = useMeetingAgenda(groupId)
  const [saving, setSaving] = useState(false)

  const isDefault = steps?.[0]?.id?.startsWith('default-')

  async function seedDefaults() {
    setSaving(true)
    const rows = DEFAULT_AGENDA_STEPS.map((s) => ({
      group_id: groupId,
      step_key: s.step_key,
      label: s.label,
      description: s.description,
      display_order: s.display_order,
      is_enabled: s.is_enabled,
      time_box_minutes: s.time_box_minutes,
    }))
    const { error } = await supabase.from('meeting_agenda_config').insert(rows)
    setSaving(false)
    if (error) {
      toast.error('Failed to seed defaults')
    } else {
      toast.success('Default agenda steps created')
      mutate(`meeting-agenda-${groupId}`)
    }
  }

  async function updateStep(stepId: string, updates: Record<string, any>) {
    if (stepId.startsWith('default-')) {
      toast.error('Seed defaults first before editing')
      return
    }
    const { error } = await supabase
      .from('meeting_agenda_config')
      .update(updates)
      .eq('id', stepId)
    if (error) {
      toast.error('Failed to update step')
    } else {
      mutate(`meeting-agenda-${groupId}`)
    }
  }

  async function swapOrder(indexA: number, indexB: number) {
    if (!steps || indexA < 0 || indexB >= steps.length) return
    const a = steps[indexA]
    const b = steps[indexB]
    if (a.id.startsWith('default-') || b.id.startsWith('default-')) {
      toast.error('Seed defaults first before reordering')
      return
    }
    await Promise.all([
      supabase.from('meeting_agenda_config').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('meeting_agenda_config').update({ display_order: a.display_order }).eq('id', b.id),
    ])
    mutate(`meeting-agenda-${groupId}`)
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load agenda configuration.</p>
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Meeting Agenda Steps</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the agenda steps for L10 meetings in this group.
          </p>
        </div>
        {isDefault && (
          <Button onClick={seedDefaults} disabled={saving}>
            {saving ? 'Creating...' : 'Seed Defaults'}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {steps?.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3 rounded-md border p-3">
            <div className="flex flex-col gap-0.5">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => swapOrder(index, index - 1)} disabled={index === 0}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => swapOrder(index, index + 1)} disabled={index === (steps?.length ?? 0) - 1}>
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <Switch
              checked={step.is_enabled}
              onCheckedChange={(val) => updateStep(step.id, { is_enabled: val })}
            />
            <Input
              value={step.label}
              onChange={(e) => updateStep(step.id, { label: e.target.value })}
              className="h-8 text-sm flex-1 max-w-[200px]"
            />
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{step.step_key}</span>
            <div className="flex items-center gap-1 ml-auto">
              <Input
                type="number"
                value={step.time_box_minutes}
                onChange={(e) => updateStep(step.id, { time_box_minutes: parseInt(e.target.value) || 0 })}
                className="h-8 w-16 text-sm text-center"
                min={0}
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
