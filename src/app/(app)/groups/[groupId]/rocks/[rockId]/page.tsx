'use client'

import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MilestoneList } from '@/components/milestone-list'

export default function RockDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  const rockId = params.rockId as string
  const supabase = createClient()

  const { data: rock, isLoading } = useSWR(`rock-${rockId}`, async () => {
    const { data, error } = await supabase
      .from('rocks')
      .select('*, owner:profiles!owner_id(id, full_name), quarter:quarters!quarter_id(id, label, is_current)')
      .eq('id', rockId)
      .single()
    if (error) throw error
    return data
  })

  async function updateRock(field: string, value: any) {
    await supabase.from('rocks').update({ [field]: value }).eq('id', rockId)
    mutate(`rock-${rockId}`)
    mutate(`rocks-${groupId}-${rock?.quarter_id}`)
  }

  if (isLoading || !rock) {
    return <p className="text-muted-foreground">Loading rock...</p>
  }

  const isCurrentQuarter = rock.quarter?.is_current ?? false
  const readOnly = !isCurrentQuarter

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>
        <Badge variant="outline">{rock.quarter?.label}</Badge>
        {readOnly && <Badge variant="secondary">Read-only</Badge>}
      </div>

      <div className="space-y-4">
        <div>
          {readOnly ? (
            <h1 className="text-2xl font-semibold">{rock.title}</h1>
          ) : (
            <Input
              defaultValue={rock.title}
              onBlur={(e) => {
                if (e.target.value !== rock.title) updateRock('title', e.target.value)
              }}
              className="text-2xl font-semibold h-auto py-1 border-transparent hover:border-input focus:border-input"
            />
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Owner: {rock.owner?.full_name || 'Unassigned'}</span>
          <span>|</span>
          <span>Status: <Badge variant={rock.status === 'on_track' ? 'default' : 'destructive'}>{rock.status === 'on_track' ? 'On Track' : 'Off Track'}</Badge></span>
          <span>|</span>
          <span>Completion: {rock.completion.replace('_', ' ')}</span>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Notes</label>
          {readOnly ? (
            <p className="mt-1 text-sm">{rock.notes || 'No notes'}</p>
          ) : (
            <textarea
              defaultValue={rock.notes || ''}
              onBlur={(e) => updateRock('notes', e.target.value || null)}
              className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Add notes..."
            />
          )}
        </div>
      </div>

      <Separator />

      <MilestoneList rockId={rockId} readOnly={readOnly} />
    </div>
  )
}
