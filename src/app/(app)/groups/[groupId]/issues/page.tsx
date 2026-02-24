'use client'

import { useParams } from 'next/navigation'
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
          <h1 className="text-2xl font-semibold">Issues</h1>
          <CreateIssueDialog groupId={groupId} />
        </div>
        <IssueBoard groupId={groupId} />
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">To-Dos</h2>
          <CreateTodoDialog groupId={groupId} />
        </div>
        <TodoList groupId={groupId} />
      </div>
    </div>
  )
}
