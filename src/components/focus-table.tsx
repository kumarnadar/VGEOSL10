'use client'

import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus } from 'lucide-react'
import { useState } from 'react'

interface FocusTableProps {
  snapshot: any
  readOnly?: boolean
  showOwner?: boolean
  ownerName?: string
}

const DETAIL_FIELDS = [
  { key: 'location', label: 'Location' },
  { key: 'prospect_value', label: 'Value' },
  { key: 'pipeline_status', label: 'Pipeline Status' },
  { key: 'key_decision_maker', label: 'Key Decision Maker' },
  { key: 'weekly_action', label: 'Weekly Action' },
  { key: 'obstacles', label: 'Obstacles' },
  { key: 'resources_needed', label: 'Resources Needed' },
  { key: 'strategy', label: 'Strategy' },
]

export function FocusTable({ snapshot, readOnly = false, showOwner = false, ownerName }: FocusTableProps) {
  const supabase = createClient()
  const [newSubject, setNewSubject] = useState('')
  const items = snapshot?.focus_items?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)) || []

  async function updateItem(itemId: string, field: string, value: any) {
    const updateValue = field === 'prospect_value' ? (value ? Number(value) : null) : (value || null)
    await supabase.from('focus_items').update({ [field]: updateValue }).eq('id', itemId)
    mutate(`focus-${snapshot.user_id}-${snapshot.group_id}-${snapshot.week_date}`)
    mutate(`group-focus-${snapshot.group_id}-${snapshot.week_date}`)
  }

  async function addItem() {
    if (!newSubject.trim() || !snapshot) return
    const maxOrder = items.reduce((max: number, i: any) => Math.max(max, i.sort_order || 0), -1)
    await supabase.from('focus_items').insert({
      snapshot_id: snapshot.id,
      company_subject: newSubject.trim(),
      sort_order: maxOrder + 1,
    })
    setNewSubject('')
    mutate(`focus-${snapshot.user_id}-${snapshot.group_id}-${snapshot.week_date}`)
  }

  async function deleteItem(itemId: string) {
    await supabase.from('focus_items').delete().eq('id', itemId)
    mutate(`focus-${snapshot.user_id}-${snapshot.group_id}-${snapshot.week_date}`)
  }

  return (
    <div className="space-y-4">
      {showOwner && ownerName && (
        <h3 className="font-semibold">{ownerName}</h3>
      )}

      <div className="space-y-3 animate-stagger">
        {items.map((item: any, index: number) => (
          <Card key={item.id} className="card-hover animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge variant="outline" className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold">
                    {item.priority || index + 1}
                  </Badge>
                  {readOnly ? (
                    <h4 className="font-semibold text-base break-words">{item.company_subject || 'Untitled'}</h4>
                  ) : (
                    <Input
                      defaultValue={item.company_subject ?? ''}
                      onBlur={(e) => {
                        if (e.target.value !== (item.company_subject ?? '')) {
                          updateItem(item.id, 'company_subject', e.target.value)
                        }
                      }}
                      className="font-semibold text-base h-9"
                      placeholder="Company / Subject"
                    />
                  )}
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteItem(item.id)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {DETAIL_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {field.label}
                    </label>
                    {readOnly ? (
                      <p className="text-sm break-words whitespace-pre-wrap min-h-[24px]">
                        {item[field.key] || <span className="text-muted-foreground">-</span>}
                      </p>
                    ) : (
                      <Input
                        defaultValue={item[field.key] ?? ''}
                        onBlur={(e) => {
                          if (e.target.value !== (item[field.key] ?? '')) {
                            updateItem(item.id, field.key, e.target.value)
                          }
                        }}
                        className="h-8 text-sm"
                        placeholder={field.label}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No focus items for this week.</p>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder="Add new company/subject..."
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <Button onClick={addItem} disabled={!newSubject.trim()} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
