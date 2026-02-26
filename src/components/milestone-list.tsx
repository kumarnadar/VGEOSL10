'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface MilestoneListProps {
  rockId: string
  readOnly?: boolean
}

export function MilestoneList({ rockId, readOnly = false }: MilestoneListProps) {
  const supabase = createClient()
  const [newTitle, setNewTitle] = useState('')

  const { data: milestones, isLoading } = useSWR(`milestones-${rockId}`, async () => {
    const { data, error } = await supabase
      .from('milestones')
      .select('*, collaborators:milestone_collaborators(user_id, profiles(full_name))')
      .eq('rock_id', rockId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data
  })

  async function addMilestone() {
    if (!newTitle.trim()) return
    const maxOrder = milestones?.reduce((max: number, m: any) => Math.max(max, m.sort_order), -1) ?? -1
    await supabase.from('milestones').insert({
      rock_id: rockId,
      title: newTitle.trim(),
      sort_order: maxOrder + 1,
    })
    setNewTitle('')
    mutate(`milestones-${rockId}`)
  }

  async function updateMilestone(id: string, field: string, value: any) {
    await supabase.from('milestones').update({ [field]: value }).eq('id', id)
    mutate(`milestones-${rockId}`)
  }

  async function deleteMilestone(id: string) {
    await supabase.from('milestones').delete().eq('id', id)
    mutate(`milestones-${rockId}`)
  }

  async function moveMilestone(index: number, direction: 'up' | 'down') {
    if (!milestones) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= milestones.length) return

    const updates = milestones.map((m: any, i: number) => {
      let newOrder = m.sort_order
      if (i === index) newOrder = milestones[newIndex].sort_order
      if (i === newIndex) newOrder = milestones[index].sort_order
      return { id: m.id, sort_order: newOrder }
    })

    await Promise.all(
      updates
        .filter((u: any, i: number) => u.sort_order !== milestones[i].sort_order)
        .map((u: any) =>
          supabase.from('milestones').update({ sort_order: u.sort_order }).eq('id', u.id)
        )
    )
    mutate(`milestones-${rockId}`)
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading milestones...</p>

  const statusColors: Record<string, string> = {
    not_started: 'text-gray-500 dark:text-gray-400',
    wip: 'text-primary',
    done: 'text-green-600 dark:text-green-400',
    delayed: 'text-red-600 dark:text-red-400',
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Milestones</h3>

      <Table>
        <TableHeader>
          <TableRow>
            {!readOnly && <TableHead className="w-20">Order</TableHead>}
            <TableHead>Title</TableHead>
            <TableHead className="w-32">Due Date</TableHead>
            <TableHead className="w-36">Status</TableHead>
            <TableHead>Collaborators</TableHead>
            <TableHead>Notes</TableHead>
            {!readOnly && <TableHead className="w-20"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {milestones?.map((milestone: any, index: number) => (
            <TableRow key={milestone.id}>
              {!readOnly && (
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveMilestone(index, 'up')}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveMilestone(index, 'down')}
                      disabled={index === milestones!.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      ↓
                    </Button>
                  </div>
                </TableCell>
              )}
              <TableCell>
                {readOnly ? (
                  milestone.title
                ) : (
                  <Input
                    defaultValue={milestone.title}
                    onBlur={(e) => {
                      if (e.target.value !== milestone.title) {
                        updateMilestone(milestone.id, 'title', e.target.value)
                      }
                    }}
                    className="h-8"
                  />
                )}
              </TableCell>
              <TableCell>
                {readOnly ? (
                  milestone.due_date || '-'
                ) : (
                  <Input
                    type="date"
                    defaultValue={milestone.due_date || ''}
                    onBlur={(e) => updateMilestone(milestone.id, 'due_date', e.target.value || null)}
                    className="h-8"
                  />
                )}
              </TableCell>
              <TableCell>
                {readOnly ? (
                  <span className={statusColors[milestone.status] || ''}>
                    {milestone.status.replace('_', ' ')}
                  </span>
                ) : (
                  <Select
                    value={milestone.status}
                    onValueChange={(val) => updateMilestone(milestone.id, 'status', val)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="wip">WIP</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell>
                {readOnly ? (
                  milestone.collaborators_text || milestone.collaborators?.map((c: any) => c.profiles?.full_name).join(', ') || '-'
                ) : (
                  <Input
                    defaultValue={milestone.collaborators_text || ''}
                    onBlur={(e) => updateMilestone(milestone.id, 'collaborators_text', e.target.value || null)}
                    placeholder="Names..."
                    className="h-8"
                  />
                )}
              </TableCell>
              <TableCell>
                {readOnly ? (
                  milestone.notes || '-'
                ) : (
                  <Input
                    defaultValue={milestone.notes || ''}
                    onBlur={(e) => updateMilestone(milestone.id, 'notes', e.target.value || null)}
                    placeholder="Notes..."
                    className="h-8"
                  />
                )}
              </TableCell>
              {!readOnly && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMilestone(milestone.id)}
                    className="h-6 text-destructive hover:text-destructive/80"
                  >
                    Delete
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder="New milestone title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
          />
          <Button onClick={addMilestone} disabled={!newTitle.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
