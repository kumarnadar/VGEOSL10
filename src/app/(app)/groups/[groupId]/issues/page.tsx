'use client'

import { useParams } from 'next/navigation'
import { AlertCircle, CheckSquare } from 'lucide-react'
import { IssueBoard } from '@/components/issue-board'
import { CreateIssueDialog } from '@/components/create-issue-dialog'
import { TodoList } from '@/components/todo-list'
import { CreateTodoDialog } from '@/components/create-todo-dialog'
import { Separator } from '@/components/ui/separator'

export default function IssuesPage() {
  const params = useParams()
  const groupId = params.groupId as string

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
        <IssueBoard groupId={groupId} />
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
