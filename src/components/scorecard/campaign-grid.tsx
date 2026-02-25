'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useCampaignData, useCampaignMetrics } from '@/hooks/use-campaigns'
import { formatWeekHeader } from '@/lib/scorecard-utils'
import { cn } from '@/lib/utils'
import { mutate } from 'swr'

interface CampaignGridProps {
  campaignId: string
  groupId: string
  weekEndings: string[]
  readOnly?: boolean
}

interface EditingCell {
  metricKey: string
  weekEnding: string
}

export function CampaignGrid({ campaignId, groupId, weekEndings, readOnly = false }: CampaignGridProps) {
  const { user } = useUser()
  const supabase = createClient()
  const { data: weeklyData } = useCampaignData(campaignId, weekEndings)
  const { data: metrics } = useCampaignMetrics(groupId)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // Build lookup: weekEnding -> JSONB data object
  const dataMap = new Map<string, { id: string; data: Record<string, any> }>()
  weeklyData?.forEach((wd: any) => {
    dataMap.set(wd.week_ending, { id: wd.id, data: wd.data || {} })
  })

  const saveCell = useCallback(async (metricKey: string, weekEnding: string, rawValue: string) => {
    if (!user) return
    const numValue = rawValue.trim() === '' ? null : parseFloat(rawValue)
    const existing = dataMap.get(weekEnding)

    if (existing) {
      const newData = { ...existing.data, [metricKey]: isNaN(numValue as number) ? null : numValue }
      await supabase
        .from('campaign_weekly_data')
        .update({ data: newData, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else if (numValue !== null && !isNaN(numValue)) {
      await supabase.from('campaign_weekly_data').insert({
        campaign_id: campaignId,
        week_ending: weekEnding,
        data: { [metricKey]: numValue },
        entered_by: user.id,
      })
    }

    mutate(`campaign-data-${campaignId}-${weekEndings.join(',')}`)
  }, [user, supabase, campaignId, weekEndings, dataMap])

  const handleCellClick = useCallback((metricKey: string, weekEnding: string) => {
    if (readOnly) return
    const existing = dataMap.get(weekEnding)
    const val = existing?.data?.[metricKey]
    setEditingCell({ metricKey, weekEnding })
    setEditValue(val != null ? String(val) : '')
  }, [readOnly, dataMap])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, metricKey: string, weekIdx: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      saveCell(metricKey, weekEndings[weekIdx], editValue)
      setEditingCell(null)

      if (e.key === 'Tab' && !e.shiftKey && weekIdx < weekEndings.length - 1) {
        handleCellClick(metricKey, weekEndings[weekIdx + 1])
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }, [editValue, weekEndings, saveCell, handleCellClick])

  const handleBlur = useCallback((metricKey: string, weekEnding: string) => {
    saveCell(metricKey, weekEnding, editValue)
    setEditingCell(null)
  }, [editValue, saveCell])

  if (!metrics || metrics.length === 0) return null

  // Compute totals per metric
  const getMetricTotal = (metricKey: string): number => {
    let total = 0
    weekEndings.forEach((week) => {
      const val = dataMap.get(week)?.data?.[metricKey]
      if (val != null) total += Number(val)
    })
    return total
  }

  // Format value based on data type
  const formatMetricValue = (val: any, dataType: string): string => {
    if (val == null) return ''
    if (dataType === 'percentage') return `${(Number(val) * 100).toFixed(1)}%`
    return Number(val).toLocaleString()
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 text-left px-3 py-2 font-medium min-w-[180px]">
              Metric
            </th>
            {weekEndings.map((week) => (
              <th key={week} className="text-right px-3 py-2 font-medium min-w-[90px]">
                {formatWeekHeader(week)}
              </th>
            ))}
            <th className="text-right px-3 py-2 font-medium min-w-[80px]">Total</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric: any) => {
            const total = getMetricTotal(metric.metric_key)

            return (
              <tr key={metric.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="sticky left-0 z-10 bg-background px-3 py-1.5 text-left whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{metric.label}</span>
                    {metric.is_required && (
                      <span className="text-xs text-primary font-medium">*</span>
                    )}
                  </div>
                </td>

                {weekEndings.map((week, weekIdx) => {
                  const val = dataMap.get(week)?.data?.[metric.metric_key]
                  const isEditing = editingCell?.metricKey === metric.metric_key && editingCell?.weekEnding === week

                  return (
                    <td
                      key={week}
                      className={cn(
                        'text-right px-3 py-1.5',
                        !readOnly && 'cursor-pointer hover:bg-primary/5'
                      )}
                      onClick={() => handleCellClick(metric.metric_key, week)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, metric.metric_key, weekIdx)}
                          onBlur={() => handleBlur(metric.metric_key, week)}
                          className="w-full text-right bg-background border rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <span>{val != null ? formatMetricValue(val, metric.data_type) : ''}</span>
                      )}
                    </td>
                  )
                })}

                <td className="text-right px-3 py-1.5 font-medium">
                  {total > 0 ? formatMetricValue(total, metric.data_type) : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
