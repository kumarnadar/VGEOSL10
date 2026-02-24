'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TodoListProps {
  groupId: string
}

export function TodoList({ groupId }: TodoListProps) {
  const supabase = createClient()

  const { data: todos, isLoading } = useSWR(`todos-${groupId}`, async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*, assigned_to:profiles!assigned_to_id(full_name), source_issue:issues!source_issue_id(description)')
      .eq('group_id', groupId)
      .eq('is_archived', false)
      .order('due_date', { ascending: true })
    if (error) throw error
    return data
  }, { refreshInterval: 30000 })

  async function toggleTodo(todoId: string, currentStatus: string) {
    const newStatus = currentStatus === 'open' ? 'done' : 'open'
    await supabase.from('todos').update({ status: newStatus }).eq('id', todoId)
    mutate(`todos-${groupId}`)
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading to-dos...</p>

  const today = new Date().toISOString().split('T')[0]
  const openTodos = todos?.filter((t: any) => t.status === 'open') || []
  const doneTodos = todos?.filter((t: any) => t.status === 'done') || []

  return (
    <div className="space-y-2">
      {openTodos.length === 0 && <p className="text-sm text-muted-foreground">No open to-dos.</p>}
      {openTodos.map((todo: any) => {
        const isOverdue = todo.due_date < today
        return (
          <div key={todo.id} className={cn('flex items-start gap-3 rounded-lg border p-3', isOverdue && 'border-red-200 bg-red-50')}>
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggleTodo(todo.id, todo.status)}
              className="mt-1 h-4 w-4 cursor-pointer"
            />
            <div className="flex-1">
              <p className="text-sm">{todo.description}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{todo.assigned_to?.full_name}</span>
                <span>·</span>
                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                  Due: {todo.due_date}
                </span>
                {todo.source_issue?.description && (
                  <>
                    <span>·</span>
                    <span>From: {todo.source_issue.description.substring(0, 40)}...</span>
                  </>
                )}
              </div>
            </div>
            {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
          </div>
        )
      })}

      {doneTodos.length > 0 && (
        <details className="mt-3">
          <summary className="text-sm text-muted-foreground cursor-pointer">
            {doneTodos.length} completed to-do{doneTodos.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {doneTodos.map((todo: any) => (
              <div key={todo.id} className="flex items-start gap-3 rounded-lg border bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleTodo(todo.id, todo.status)}
                  className="mt-1 h-4 w-4 cursor-pointer"
                />
                <p className="text-sm line-through text-muted-foreground">{todo.description}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
