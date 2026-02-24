'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { useUser } from '@/hooks/use-user'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CreateIssueDialog } from '@/components/create-issue-dialog'
import { IssueDetailDialog } from '@/components/issue-detail-dialog'
import { TodoList } from '@/components/todo-list'
import { CreateTodoDialog } from '@/components/create-todo-dialog'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/page-skeleton'

export default function IssuesPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const { user } = useUser()
  const supabase = createClient()

  const [raisedByFilter, setRaisedByFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data: issues, isLoading } = useSWR(`issues-${groupId}`, async () => {
    const { data } = await supabase
      .from('issues')
      .select('*, raised_by_user:profiles!raised_by(id, full_name), assigned_to:profiles!assigned_to_id(full_name)')
      .eq('group_id', groupId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    return data || []
  }, { refreshInterval: 30000 })

  // Build filter options from data
  const raisedByOptions = [...new Map(
    (issues || []).map((i: any) => [i.raised_by_user?.id, i.raised_by_user?.full_name])
  ).entries()].filter(([id]) => id)

  const priorityOptions = [...new Set(
    (issues || []).map((i: any) => i.priority).filter((p: any) => p != null)
  )].sort((a: any, b: any) => a - b)

  // Apply filters
  const filteredIssues = (issues || []).filter((issue: any) => {
    if (raisedByFilter && issue.raised_by_user?.id !== raisedByFilter) return false
    if (priorityFilter && String(issue.priority) !== priorityFilter) return false
    if (statusFilter && issue.status !== statusFilter) return false
    return true
  })

  const statusColors: Record<string, string> = {
    open: 'default',
    in_discussion: 'secondary',
    closed: 'outline',
  }

  function handleRowClick(issue: any) {
    setSelectedIssue(issue)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Issues & To-Dos</h1>
      </div>

      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="todos">To-Dos</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4 mt-4">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={raisedByFilter || 'all'} onValueChange={(v) => setRaisedByFilter(v === 'all' ? null : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Raised By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {raisedByOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id!}>{name}{id === user?.id ? ' (Me)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter || 'all'} onValueChange={(v) => setPriorityFilter(v === 'all' ? null : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {priorityOptions.map((p: any) => (
                  <SelectItem key={p} value={String(p)}>Priority #{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? null : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_discussion">In Discussion</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <CreateIssueDialog groupId={groupId} />
            </div>
          </div>

          {/* Issues table */}
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : filteredIssues.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-7 w-7" />}
              title="No issues found"
              description={raisedByFilter || priorityFilter || statusFilter ? "No issues match the current filters." : "No issues have been raised for this group yet."}
            />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2.5 px-3 font-medium w-12">#</th>
                    <th className="text-left py-2.5 px-3 font-medium">Description</th>
                    <th className="text-left py-2.5 px-3 font-medium">Raised By</th>
                    <th className="text-left py-2.5 px-3 font-medium">Date</th>
                    <th className="text-left py-2.5 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((issue: any) => (
                    <tr
                      key={issue.id}
                      className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${issue.status === 'closed' ? 'opacity-60' : ''}`}
                      onClick={() => handleRowClick(issue)}
                    >
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">
                        {issue.priority || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium max-w-md">
                        <span className={issue.status === 'closed' ? 'line-through' : ''}>
                          {issue.description}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {issue.raised_by_user?.full_name || '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {issue.created_at ? new Date(issue.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={statusColors[issue.status] as any}>
                          {issue.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="todos" className="space-y-4 mt-4">
          <div className="flex items-center justify-end">
            <CreateTodoDialog groupId={groupId} />
          </div>
          <TodoList groupId={groupId} />
        </TabsContent>
      </Tabs>

      <IssueDetailDialog
        issue={selectedIssue}
        groupId={groupId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
