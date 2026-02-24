'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuarters } from '@/hooks/use-rocks'
import { useUser } from '@/hooks/use-user'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateRockDialogProps {
  groupId: string
}

export function CreateRockDialog({ groupId }: CreateRockDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [quarterId, setQuarterId] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const supabase = createClient()
  const { data: quarters } = useQuarters()
  const { user } = useUser()

  // Default to current quarter
  const currentQuarter = quarters?.find((q: any) => q.is_current)
  if (currentQuarter && !quarterId) {
    setQuarterId(currentQuarter.id)
  }

  async function handleCreate() {
    if (!title.trim() || !quarterId || !user) return

    await supabase.from('rocks').insert({
      title: title.trim(),
      owner_id: user.id,
      group_id: groupId,
      quarter_id: quarterId,
      target_completion_date: targetDate || null,
      notes: notes || null,
    })

    setTitle('')
    setTargetDate('')
    setNotes('')
    setOpen(false)
    mutate(`rocks-${groupId}-${quarterId}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Rock</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Rock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Launch new CRM integration"
            />
          </div>
          <div className="space-y-2">
            <Label>Quarter</Label>
            <Select value={quarterId} onValueChange={setQuarterId}>
              <SelectTrigger>
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                {quarters?.map((q: any) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.label} {q.is_current ? '(Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target Completion Date (optional)</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional context..." />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={!title.trim()}>
            Create Rock
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
