'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPicker } from '@/components/user-picker'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface CreateTodoDialogProps {
  groupId: string
  sourceIssueId?: string
}

export function CreateTodoDialog({ groupId, sourceIssueId }: CreateTodoDialogProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const supabase = createClient()

  async function handleCreate() {
    if (!description.trim() || !assignedTo || !dueDate) return

    await supabase.from('todos').insert({
      group_id: groupId,
      description: description.trim(),
      assigned_to_id: assignedTo,
      due_date: dueDate,
      source_issue_id: sourceIssueId || null,
    })

    setDescription('')
    setAssignedTo(null)
    setOpen(false)
    mutate(`todos-${groupId}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">New To-Do</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create To-Do</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div className="space-y-2">
            <Label>Assign To</Label>
            <UserPicker value={assignedTo} onChange={(id) => setAssignedTo(id)} />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={!description.trim() || !assignedTo}>Create To-Do</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
