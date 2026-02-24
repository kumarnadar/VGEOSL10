'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { AlertCircle, CheckSquare } from 'lucide-react'
import { IssueBoard } from '@/components/issue-board'
import { CreateIssueDialog } from '@/components/create-issue-dialog'
import { TodoList } from '@/components/todo-list'
import { CreateTodoDialog } from '@/components/create-todo-dialog'
import { Separator } from '@/components/ui/separator'
import { FilterChip } from '@/components/filter-chip'

export default function IssuesPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const searchParams = useSearchParams()
  const router = useRouter()
  const statusFilter = searchParams.get('status')

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Issues</h1>
          </div>
          <CreateIssueDialog groupId={groupId} />
        </div>
        {statusFilter && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            <FilterChip
              label="Status"
              value={statusFilter === 'open' ? 'Open Issues' : statusFilter}
              onClear={() => router.replace(`/groups/${groupId}/issues`)}
            />
          </div>
        )}
        <IssueBoard groupId={groupId} showClosed={!statusFilter || statusFilter !== 'open'} />
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">To-Dos</h2>
          </div>
          <CreateTodoDialog groupId={groupId} />
        </div>
        <TodoList groupId={groupId} />
      </div>
    </div>
  )
}
