'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'

interface IssueBoardProps {
  groupId: string
}

export function IssueBoard({ groupId }: IssueBoardProps) {
  const supabase = createClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: issues, isLoading } = useSWR(`issues-${groupId}`, async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*, raised_by_user:profiles!raised_by(full_name), assigned_to:profiles!assigned_to_id(full_name)')
      .eq('group_id', groupId)
      .eq('is_archived', false)
      .order('priority', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }, { refreshInterval: 30000 })

  async function updateStatus(issueId: string, status: string) {
    const updates: any = { status }
    if (status === 'closed') updates.closed_at = new Date().toISOString()
    await supabase.from('issues').update(updates).eq('id', issueId)
    mutate(`issues-${groupId}`)
  }

  async function updateResolution(issueId: string, notes: string) {
    await supabase.from('issues').update({ resolution_notes: notes }).eq('id', issueId)
    mutate(`issues-${groupId}`)
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading issues...</p>

  const statusBadge: Record<string, 'default' | 'secondary' | 'outline'> = {
    open: 'default',
    in_discussion: 'secondary',
    closed: 'outline',
  }

  const openIssues = issues?.filter((i: any) => i.status !== 'closed') || []
  const closedIssues = issues?.filter((i: any) => i.status === 'closed') || []

  return (
    <div className="space-y-3">
      {openIssues.length === 0 && <p className="text-sm text-muted-foreground">No open issues.</p>}
      {openIssues.map((issue: any) => (
        <div key={issue.id} className="rounded-lg border bg-white p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {issue.priority && <span className="text-xs font-mono text-muted-foreground">#{issue.priority}</span>}
                <p className="text-sm font-medium">{issue.description}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Raised by {issue.raised_by_user?.full_name}
                {issue.assigned_to?.full_name && ` · Assigned to ${issue.assigned_to.full_name}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge[issue.status]}>{issue.status.replace('_', ' ')}</Badge>
              <Select value={issue.status} onValueChange={(val) => updateStatus(issue.id, val)}>
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_discussion">In Discussion</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
            className="text-xs"
          >
            {expandedId === issue.id ? 'Hide Details' : 'Show Details'}
          </Button>
          {expandedId === issue.id && (
            <div className="pt-2 border-t">
              <label className="text-xs font-medium text-muted-foreground">Resolution Notes</label>
              <Input
                defaultValue={issue.resolution_notes || ''}
                onBlur={(e) => updateResolution(issue.id, e.target.value)}
                placeholder="Add resolution notes..."
                className="mt-1"
              />
            </div>
          )}
        </div>
      ))}

      {closedIssues.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer">
            {closedIssues.length} closed issue{closedIssues.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {closedIssues.map((issue: any) => (
              <div key={issue.id} className="rounded-lg border bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Closed</Badge>
                  <p className="text-sm">{issue.description}</p>
                </div>
                {issue.resolution_notes && (
                  <p className="text-xs text-muted-foreground mt-1">Resolution: {issue.resolution_notes}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
