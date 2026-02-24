'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { UserPicker } from '@/components/user-picker'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface CreateIssueDialogProps {
  groupId: string
}

export function CreateIssueDialog({ groupId }: CreateIssueDialogProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const supabase = createClient()
  const { user } = useUser()

  async function handleCreate() {
    if (!description.trim() || !user) return

    await supabase.from('issues').insert({
      group_id: groupId,
      raised_by: user.id,
      description: description.trim(),
      priority: priority ? parseInt(priority) : null,
      assigned_to_id: assignedTo,
    })

    setDescription('')
    setPriority('')
    setAssignedTo(null)
    setOpen(false)
    mutate(`issues-${groupId}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Issue</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise Issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue..." />
          </div>
          <div className="space-y-2">
            <Label>Priority Rank (optional)</Label>
            <Input type="number" min="1" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="1 = highest" />
          </div>
          <div className="space-y-2">
            <Label>Assign To (optional)</Label>
            <UserPicker value={assignedTo} onChange={(id) => setAssignedTo(id)} placeholder="Assign to..." />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={!description.trim()}>Create Issue</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
