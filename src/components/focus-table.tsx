'use client'

import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useState } from 'react'

interface FocusTableProps {
  snapshot: any
  readOnly?: boolean
  showOwner?: boolean
  ownerName?: string
}

const COLUMNS = [
  { key: 'priority', label: 'Priority', width: 'w-20' },
  { key: 'company_subject', label: 'Company/Subject', width: 'w-40' },
  { key: 'location', label: 'Location', width: 'w-24' },
  { key: 'prospect_value', label: 'Value', width: 'w-24' },
  { key: 'pipeline_status', label: 'Pipeline', width: 'w-28' },
  { key: 'key_decision_maker', label: 'KDM', width: 'w-28' },
  { key: 'weekly_action', label: 'Weekly Action', width: 'w-40' },
  { key: 'obstacles', label: 'Obstacles', width: 'w-32' },
  { key: 'resources_needed', label: 'Resources', width: 'w-32' },
  { key: 'strategy', label: 'Strategy', width: 'w-32' },
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
    <div className="space-y-2">
      {showOwner && ownerName && (
        <h3 className="font-semibold text-sm">{ownerName}</h3>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead key={col.key} className={col.width}>{col.label}</TableHead>
              ))}
              {!readOnly && <TableHead className="w-16"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any) => (
              <TableRow key={item.id}>
                {COLUMNS.map((col) => (
                  <TableCell key={col.key}>
                    {readOnly ? (
                      <span className="text-sm">{item[col.key] ?? '-'}</span>
                    ) : (
                      <Input
                        defaultValue={item[col.key] ?? ''}
                        onBlur={(e) => {
                          if (e.target.value !== (item[col.key] ?? '')) {
                            updateItem(item.id, col.key, e.target.value)
                          }
                        }}
                        className="h-7 text-sm"
                      />
                    )}
                  </TableCell>
                ))}
                {!readOnly && (
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)} className="h-6 text-destructive">
                      ×
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder="New company/subject..."
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <Button onClick={addItem} disabled={!newSubject.trim()} size="sm">Add</Button>
        </div>
      )}
    </div>
  )
}
