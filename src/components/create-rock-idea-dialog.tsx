'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPicker } from '@/components/user-picker'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateRockIdeaDialogProps {
  groupId: string
}

export function CreateRockIdeaDialog({ groupId }: CreateRockIdeaDialogProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [suggestedOwner, setSuggestedOwner] = useState<string | null>(null)
  const [priorityColor, setPriorityColor] = useState<string>('green')
  const [comments, setComments] = useState('')
  const supabase = createClient()

  async function handleCreate() {
    if (!description.trim()) return

    await supabase.from('rock_ideas').insert({
      group_id: groupId,
      description: description.trim(),
      suggested_owner_id: suggestedOwner,
      priority_color: priorityColor,
      comments: comments || null,
    })

    setDescription('')
    setSuggestedOwner(null)
    setPriorityColor('green')
    setComments('')
    setOpen(false)
    mutate('rock-ideas')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Rock Idea</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Rock Idea</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Rock idea description..." />
          </div>
          <div className="space-y-2">
            <Label>Suggested Owner (optional)</Label>
            <UserPicker value={suggestedOwner} onChange={(id) => setSuggestedOwner(id)} placeholder="Suggest an owner..." />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priorityColor} onValueChange={setPriorityColor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="red">Red (High)</SelectItem>
                <SelectItem value="yellow">Yellow (Medium)</SelectItem>
                <SelectItem value="green">Green (Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Comments (optional)</Label>
            <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Additional context..." />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={!description.trim()}>Add Idea</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
