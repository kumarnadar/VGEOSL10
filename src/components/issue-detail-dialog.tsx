'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface IssueDetailDialogProps {
  issue: any
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IssueDetailDialog({ issue, groupId, open, onOpenChange }: IssueDetailDialogProps) {
  const supabase = createClient()
  const [status, setStatus] = useState(issue?.status || 'open')
  const [resolution, setResolution] = useState(issue?.resolution_notes || '')

  // Reset state when issue changes
  if (issue && status !== issue.status && !open) {
    setStatus(issue.status)
    setResolution(issue.resolution_notes || '')
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus)
    const updates: any = { status: newStatus }
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString()
    await supabase.from('issues').update(updates).eq('id', issue.id)
    mutate(`issues-${groupId}`)
  }

  async function handleSaveResolution() {
    await supabase.from('issues').update({ resolution_notes: resolution }).eq('id', issue.id)
    mutate(`issues-${groupId}`)
  }

  if (!issue) return null

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_discussion: 'bg-amber-100 text-amber-800',
    closed: 'bg-green-100 text-green-800',
  }

  const createdDate = issue.created_at ? new Date(issue.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'
  const closedDate = issue.closed_at ? new Date(issue.closed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {issue.priority && <span className="text-sm font-mono text-muted-foreground">#{issue.priority}</span>}
            Issue Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <p className="text-sm break-words whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* Two column grid for metadata */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Raised By</label>
              <p className="text-sm">{issue.raised_by_user?.full_name || '-'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Raised</label>
              <p className="text-sm">{createdDate}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned To</label>
              <p className="text-sm">{issue.assigned_to?.full_name || 'Unassigned'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
              <p className="text-sm">{issue.priority || 'None'}</p>
            </div>
          </div>

          {/* Status with inline change */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_discussion">In Discussion</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {closedDate && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Closed On</label>
              <p className="text-sm">{closedDate}</p>
            </div>
          )}

          {/* Resolution Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolution Notes</label>
            <Input
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              onBlur={handleSaveResolution}
              placeholder="Add resolution notes..."
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
