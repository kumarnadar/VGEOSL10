'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { useScorecardSettings, useScorecardTemplate } from '@/hooks/use-scorecard'
import { useCampaignMetrics } from '@/hooks/use-campaigns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

const WEEK_DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

const DATA_TYPES = [
  { value: 'count', label: 'Count' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'decimal', label: 'Decimal' },
]

interface MetricRow {
  id?: string
  metric_key: string
  label: string
  data_type: string
  is_required: boolean
  display_order: number
  isNew?: boolean
}

interface MeasureForm {
  name: string
  unit: string
  rollup_type: string
  display_order: number
}

export function ScorecardTab({ groups }: { groups: { id: string; name: string }[] }) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '')

  if (groups.length === 0) {
    return <p className="text-muted-foreground">No groups available.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label htmlFor="scorecard-group" className="shrink-0 font-semibold">Group:</Label>
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-64" id="scorecard-group">
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && (
        <>
          <WeekEndingDaySection groupId={selectedGroupId} />
          <CampaignMetricsSection groupId={selectedGroupId} />
          <MeasuresSection groupId={selectedGroupId} />
        </>
      )}
    </div>
  )
}

function WeekEndingDaySection({ groupId }: { groupId: string }) {
  const supabase = createClient()
  const { data: settings } = useScorecardSettings(groupId)
  const weekEndingDay = settings?.week_ending_day || 'friday'
  const [saving, setSaving] = useState(false)

  const handleChange = useCallback(async (value: string) => {
    setSaving(true)
    const { error } = await supabase
      .from('scorecard_settings')
      .upsert(
        { group_id: groupId, setting_key: 'week_ending_day', setting_value: value },
        { onConflict: 'group_id,setting_key' }
      )
    setSaving(false)
    if (error) {
      toast.error('Failed to update week-ending day')
    } else {
      toast.success('Week-ending day updated')
      mutate(`scorecard-settings-${groupId}`)
    }
  }, [supabase, groupId])

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h3 className="text-lg font-semibold">Week-Ending Day</h3>
      <p className="text-sm text-muted-foreground">
        Choose which day of the week scorecard entries are due.
      </p>
      <div className="flex items-center gap-3">
        <Label htmlFor="week-ending-day" className="shrink-0">Week ends on:</Label>
        <Select value={weekEndingDay} onValueChange={handleChange} disabled={saving}>
          <SelectTrigger className="w-44" id="week-ending-day">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEK_DAYS.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function CampaignMetricsSection({ groupId }: { groupId: string }) {
  const supabase = createClient()
  const { data: metricsRaw } = useCampaignMetrics(groupId)
  const [metrics, setMetrics] = useState<MetricRow[] | null>(null)
  const [saving, setSaving] = useState(false)

  const displayMetrics: MetricRow[] = metrics ?? (metricsRaw?.map((m: any, i: number) => ({
    id: m.id,
    metric_key: m.metric_key,
    label: m.label,
    data_type: m.data_type,
    is_required: m.is_required,
    display_order: m.display_order ?? i,
  })) || [])

  const handleAddMetric = () => {
    const current = [...displayMetrics]
    const maxOrder = current.reduce((max, m) => Math.max(max, m.display_order), 0)
    current.push({
      metric_key: '',
      label: '',
      data_type: 'count',
      is_required: false,
      display_order: maxOrder + 1,
      isNew: true,
    })
    setMetrics(current)
  }

  const handleMetricChange = (index: number, field: keyof MetricRow, value: any) => {
    const current = [...displayMetrics]
    current[index] = { ...current[index], [field]: value }
    if (field === 'label' && current[index].isNew) {
      current[index].metric_key = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    }
    setMetrics(current)
  }

  const handleDeleteMetric = async (index: number) => {
    const metric = displayMetrics[index]
    if (metric.is_required) {
      toast.error('Cannot delete required core metrics')
      return
    }
    if (metric.id) {
      const { error } = await supabase
        .from('campaign_metric_definitions')
        .delete()
        .eq('id', metric.id)
      if (error) {
        toast.error('Failed to delete metric')
        return
      }
      mutate(`campaign-metrics-${groupId}`)
    }
    const current = [...displayMetrics]
    current.splice(index, 1)
    setMetrics(current)
    toast.success('Metric removed')
  }

  const handleSaveMetrics = async () => {
    setSaving(true)
    try {
      for (const metric of displayMetrics) {
        if (!metric.metric_key || !metric.label) continue
        if (metric.isNew) {
          await supabase.from('campaign_metric_definitions').insert({
            group_id: groupId,
            metric_key: metric.metric_key,
            label: metric.label,
            data_type: metric.data_type,
            is_required: metric.is_required,
            display_order: metric.display_order,
          })
        } else if (metric.id) {
          await supabase.from('campaign_metric_definitions').update({
            label: metric.label,
            data_type: metric.data_type,
            display_order: metric.display_order,
          }).eq('id', metric.id)
        }
      }
      toast.success('Campaign metrics saved')
      setMetrics(null)
      mutate(`campaign-metrics-${groupId}`)
    } catch {
      toast.error('Failed to save metrics')
    }
    setSaving(false)
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campaign Metric Columns</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which data columns appear in the campaign tracker.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddMetric}>
          <Plus className="h-4 w-4 mr-1" />
          Add Column
        </Button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_120px_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
          <span>Label</span>
          <span>Key</span>
          <span>Data Type</span>
          <span>Required</span>
          <span></span>
        </div>

        {displayMetrics
          .sort((a, b) => a.display_order - b.display_order)
          .map((metric, index) => (
          <div
            key={metric.id || `new-${index}`}
            className="grid grid-cols-[1fr_1fr_120px_80px_40px] gap-2 items-center rounded-md border p-2"
          >
            <Input
              value={metric.label}
              onChange={(e) => handleMetricChange(index, 'label', e.target.value)}
              placeholder="Column name"
              className="h-8 text-sm"
              disabled={metric.is_required}
            />
            <Input
              value={metric.metric_key}
              className="h-8 text-sm font-mono text-muted-foreground"
              disabled
            />
            <Select
              value={metric.data_type}
              onValueChange={(v) => handleMetricChange(index, 'data_type', v)}
              disabled={metric.is_required}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-center">
              <Switch checked={metric.is_required} disabled />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDeleteMetric(index)}
              disabled={metric.is_required}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      {metrics && (
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSaveMetrics} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  )
}

function MeasuresSection({ groupId }: { groupId: string }) {
  const supabase = createClient()
  const { data: template } = useScorecardTemplate(groupId)
  const [editingMeasure, setEditingMeasure] = useState<any | null>(null)
  const [addingToSection, setAddingToSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sections = template?.scorecard_sections || []

  async function handleReorder(measureId: string, sectionMeasures: any[], currentIndex: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= sectionMeasures.length) return

    const current = sectionMeasures[currentIndex]
    const swap = sectionMeasures[swapIndex]

    await Promise.all([
      supabase.from('scorecard_measures').update({ display_order: swap.display_order }).eq('id', current.id),
      supabase.from('scorecard_measures').update({ display_order: current.display_order }).eq('id', swap.id),
    ])
    mutate(`scorecard-template-${groupId}`)
  }

  async function handleDeleteMeasure(measureId: string) {
    if (!confirm('Delete this measure? This will also delete all entries and goals for it.')) return
    const { error } = await supabase.from('scorecard_measures').delete().eq('id', measureId)
    if (error) {
      toast.error('Failed to delete measure')
    } else {
      toast.success('Measure deleted')
      mutate(`scorecard-template-${groupId}`)
    }
  }

  async function handleSaveMeasure(form: MeasureForm & { id?: string; section_id: string }) {
    setSaving(true)
    if (form.id) {
      const { error } = await supabase.from('scorecard_measures').update({
        name: form.name,
        unit: form.unit,
        rollup_type: form.rollup_type,
        display_order: form.display_order,
      }).eq('id', form.id)
      if (error) toast.error('Failed to update measure')
      else toast.success('Measure updated')
    } else {
      const { error } = await supabase.from('scorecard_measures').insert({
        section_id: form.section_id,
        name: form.name,
        unit: form.unit,
        rollup_type: form.rollup_type,
        display_order: form.display_order,
      })
      if (error) toast.error('Failed to add measure')
      else toast.success('Measure added')
    }
    setSaving(false)
    setEditingMeasure(null)
    setAddingToSection(null)
    mutate(`scorecard-template-${groupId}`)
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h3 className="text-lg font-semibold">Scorecard Measures</h3>
      <p className="text-sm text-muted-foreground">
        Manage measures per section in the scorecard template.
      </p>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">No scorecard template found for this group.</p>
      )}

      {sections.map((section: any) => {
        const measures = section.scorecard_measures || []
        return (
          <div key={section.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{section.name}</h4>
              <Button variant="outline" size="sm" onClick={() => {
                setAddingToSection(section.id)
                setEditingMeasure({
                  section_id: section.id,
                  name: '',
                  unit: 'count',
                  rollup_type: 'sum',
                  display_order: measures.length + 1,
                })
              }}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-1">
              {measures.map((m: any, idx: number) => (
                <div key={m.id} className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm">
                  <span className="flex-1">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.unit} / {m.rollup_type}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorder(m.id, measures, idx, 'up')} disabled={idx === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReorder(m.id, measures, idx, 'down')} disabled={idx === measures.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingMeasure({ ...m, section_id: section.id })}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteMeasure(m.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {editingMeasure && (
        <MeasureDialog
          measure={editingMeasure}
          open={!!editingMeasure}
          onOpenChange={(open) => { if (!open) { setEditingMeasure(null); setAddingToSection(null) } }}
          onSave={handleSaveMeasure}
          saving={saving}
        />
      )}
    </div>
  )
}

function MeasureDialog({
  measure,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  measure: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (form: any) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    name: measure.name || '',
    unit: measure.unit || 'count',
    rollup_type: measure.rollup_type || 'sum',
    display_order: measure.display_order || 1,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{measure.id ? 'Edit Measure' : 'Add Measure'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., One-Time Revenue" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rollup</Label>
              <Select value={form.rollup_type} onValueChange={(v) => setForm((p) => ({ ...p, rollup_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="latest">Latest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Display Order</Label>
            <Input type="number" value={form.display_order} onChange={(e) => setForm((p) => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
          </div>
          <Button onClick={() => onSave({ ...form, id: measure.id, section_id: measure.section_id })} className="w-full" disabled={saving || !form.name}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
