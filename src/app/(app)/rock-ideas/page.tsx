'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { useUser } from '@/hooks/use-user'
import { useQuarters } from '@/hooks/use-rocks'
import { CreateRockIdeaDialog } from '@/components/create-rock-idea-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'

export default function RockIdeasPage() {
  const supabase = createClient()
  const { user } = useUser()
  const { data: quarters } = useQuarters()
  const [promoteQuarterId, setPromoteQuarterId] = useState<string>('')

  const currentQuarter = quarters?.find((q: any) => q.is_current)
  if (currentQuarter && !promoteQuarterId) {
    setPromoteQuarterId(currentQuarter.id)
  }

  const groups = user?.group_members?.map((gm: any) => gm.groups) || []
  const firstGroupId = groups[0]?.id

  const { data: ideas, isLoading } = useSWR('rock-ideas', async () => {
    const { data, error } = await supabase
      .from('rock_ideas')
      .select('*, suggested_owner:profiles!suggested_owner_id(full_name), promoted_to_rock:rocks!promoted_to_rock_id(id, title)')
      .order('priority_color', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  })

  async function promoteIdea(ideaId: string, ownerId: string | null) {
    if (!promoteQuarterId || !ownerId) {
      alert('Please select a quarter and ensure the idea has a suggested owner.')
      return
    }

    const { error } = await supabase.rpc('promote_rock_idea', {
      p_idea_id: ideaId,
      p_quarter_id: promoteQuarterId,
      p_owner_id: ownerId,
    })

    if (error) {
      alert('Error promoting idea: ' + error.message)
      return
    }

    mutate('rock-ideas')
  }

  const colorConfig: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline'; bg: string }> = {
    red: { label: 'High Priority', variant: 'destructive', bg: 'border-destructive/30' },
    yellow: { label: 'Medium Priority', variant: 'secondary', bg: 'border-yellow-200' },
    green: { label: 'Low Priority', variant: 'outline', bg: 'border-green-200' },
  }

  const groupedIdeas = {
    red: ideas?.filter((i: any) => i.priority_color === 'red' && !i.promoted_to_rock_id) || [],
    yellow: ideas?.filter((i: any) => i.priority_color === 'yellow' && !i.promoted_to_rock_id) || [],
    green: ideas?.filter((i: any) => i.priority_color === 'green' && !i.promoted_to_rock_id) || [],
  }

  const promotedIdeas = ideas?.filter((i: any) => i.promoted_to_rock_id) || []

  if (!user) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rock Ideas</h1>
        <div className="flex items-center gap-2">
          {firstGroupId && <CreateRockIdeaDialog groupId={firstGroupId} />}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Promote to quarter:</span>
        <Select value={promoteQuarterId} onValueChange={setPromoteQuarterId}>
          <SelectTrigger className="w-40">
            <SelectValue />
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

      {isLoading ? (
        <p className="text-muted-foreground">Loading ideas...</p>
      ) : (
        <>
          {(['red', 'yellow', 'green'] as const).map((color) => (
            <div key={color}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge variant={colorConfig[color].variant}>{colorConfig[color].label}</Badge>
                <span className="text-sm text-muted-foreground">({groupedIdeas[color].length})</span>
              </h2>
              {groupedIdeas[color].length === 0 ? (
                <p className="text-sm text-muted-foreground ml-2">No ideas in this category.</p>
              ) : (
                <div className="space-y-2">
                  {groupedIdeas[color].map((idea: any) => (
                    <div key={idea.id} className={`rounded-lg border p-3 ${colorConfig[color].bg}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{idea.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {idea.suggested_owner?.full_name && `Suggested: ${idea.suggested_owner.full_name}`}
                            {idea.comments && ` · ${idea.comments}`}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => promoteIdea(idea.id, idea.suggested_owner_id || user?.id)}
                        >
                          Promote to Rock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {promotedIdeas.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-muted-foreground cursor-pointer">
                {promotedIdeas.length} promoted idea{promotedIdeas.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-2">
                {promotedIdeas.map((idea: any) => (
                  <div key={idea.id} className="rounded-lg border bg-muted p-3">
                    <p className="text-sm">{idea.description}</p>
                    <p className="text-xs text-muted-foreground">Promoted to: {idea.promoted_to_rock?.title}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
