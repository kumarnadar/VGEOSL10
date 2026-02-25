'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mutate } from 'swr'

interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
}

export function CreateCampaignDialog({ open, onOpenChange, groupId }: CreateCampaignDialogProps) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [leadsCount, setLeadsCount] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)

    const leads = leadsCount ? parseInt(leadsCount, 10) : null

    await supabase.from('campaigns').insert({
      group_id: groupId,
      name: name.trim(),
      leads_count_total: isNaN(leads as number) ? null : leads,
      status: 'active',
    })

    setSaving(false)
    setName('')
    setLeadsCount('')
    onOpenChange(false)
    mutate(`campaigns-${groupId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
          <DialogDescription>Add a new campaign to track outreach metrics.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Campaign Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Netsuite Campaign A"
              autoFocus
            />
          </div>

          <div>
            <Label>Total Leads Count</Label>
            <Input
              value={leadsCount}
              onChange={(e) => setLeadsCount(e.target.value)}
              placeholder="e.g., 300"
              type="number"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
