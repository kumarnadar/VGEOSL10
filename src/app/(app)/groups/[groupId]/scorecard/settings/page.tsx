'use client'

import { useParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useScorecardSettings } from '@/hooks/use-scorecard'
import { useCampaignMetrics } from '@/hooks/use-campaigns'
import { Settings, GripVertical, Plus, Trash2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { mutate } from 'swr'
import Link from 'next/link'

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

export default function ScorecardSettingsPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const { user } = useUser()
  const supabase = createClient()

  const { data: settings } = useScorecardSettings(groupId)
  const { data: metricsRaw } = useCampaignMetrics(groupId)

  const weekEndingDay = settings?.week_ending_day || 'friday'
  const [saving, setSaving] = useState(false)

  // Campaign metrics local state
  const [metrics, setMetrics] = useState<MetricRow[] | null>(null)
  const displayMetrics: MetricRow[] = metrics ?? (metricsRaw?.map((m: any, i: number) => ({
    id: m.id,
    metric_key: m.metric_key,
    label: m.label,
    data_type: m.data_type,
    is_required: m.is_required,
    display_order: m.display_order ?? i,
  })) || [])

  // Save week-ending day
  const handleWeekEndingChange = useCallback(async (value: string) => {
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

  // Add new metric
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

  // Update metric field
  const handleMetricChange = (index: number, field: keyof MetricRow, value: any) => {
    const current = [...displayMetrics]
    current[index] = { ...current[index], [field]: value }
    // Auto-generate metric_key from label for new metrics
    if (field === 'label' && current[index].isNew) {
      current[index].metric_key = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    }
    setMetrics(current)
  }

  // Delete metric
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

  // Save all metrics
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Scorecard Settings</h1>
        </div>

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="scorecard" asChild>
              <Link href={`/groups/${groupId}/scorecard`}>Pipeline</Link>
            </TabsTrigger>
            <TabsTrigger value="campaigns" asChild>
              <Link href={`/groups/${groupId}/scorecard/campaigns`}>Campaigns</Link>
            </TabsTrigger>
            <TabsTrigger value="dashboard" asChild>
              <Link href={`/groups/${groupId}/scorecard/dashboard`}>Dashboard</Link>
            </TabsTrigger>
            <TabsTrigger value="settings" asChild>
              <Link href={`/groups/${groupId}/scorecard/settings`}>Settings</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Week-Ending Day */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Week-Ending Day</h2>
        <p className="text-sm text-muted-foreground">
          Choose which day of the week scorecard entries are due. This determines the column headers in the scorecard grid.
        </p>
        <div className="flex items-center gap-3">
          <Label htmlFor="week-ending-day" className="shrink-0">Week ends on:</Label>
          <Select value={weekEndingDay} onValueChange={handleWeekEndingChange} disabled={saving}>
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

      {/* Campaign Metric Columns */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Campaign Metric Columns</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure which data columns appear in the campaign tracker. Required columns cannot be removed.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddMetric}>
            <Plus className="h-4 w-4 mr-1" />
            Add Column
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_120px_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Label</span>
            <span>Key</span>
            <span>Data Type</span>
            <span>Required</span>
            <span></span>
          </div>

          {displayMetrics
            .sort((a: MetricRow, b: MetricRow) => a.display_order - b.display_order)
            .map((metric: MetricRow, index: number) => (
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
                <Switch
                  checked={metric.is_required}
                  disabled
                />
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
    </div>
  )
}
