'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuarters } from '@/hooks/use-rocks'
import { mutate } from 'swr'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface RockCompletionDropdownProps {
  rock: any
  groupId: string
}

export function RockCompletionDropdown({ rock, groupId }: RockCompletionDropdownProps) {
  const supabase = createClient()
  const { data: quarters } = useQuarters()
  const [rollForwardOpen, setRollForwardOpen] = useState(false)
  const [targetQuarterId, setTargetQuarterId] = useState('')
  const [rollResult, setRollResult] = useState<string | null>(null)

  const futureQuarters = quarters?.filter((q: any) => q.id !== rock.quarter_id) || []

  async function handleCompletionChange(value: string) {
    if (value === 'rolled_forward') {
      setRollForwardOpen(true)
      return
    }

    await supabase.from('rocks').update({ completion: value }).eq('id', rock.id)
    mutate(`rocks-${groupId}-${rock.quarter_id}`)
    mutate(`rock-${rock.id}`)
  }

  async function handleRollForward() {
    if (!targetQuarterId) return

    const { data, error } = await supabase.rpc('roll_forward_rock', {
      p_rock_id: rock.id,
      p_new_quarter_id: targetQuarterId,
    })

    if (error) {
      alert('Error rolling forward: ' + error.message)
      return
    }

    setRollResult(data)
    mutate(`rocks-${groupId}-${rock.quarter_id}`)
    mutate(`rocks-${groupId}-${targetQuarterId}`)
    mutate(`rock-${rock.id}`)
  }

  return (
    <>
      <Select value={rock.completion} onValueChange={handleCompletionChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="not_done">Not Done</SelectItem>
          <SelectItem value="rolled_forward">Roll Forward</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={rollForwardOpen} onOpenChange={setRollForwardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roll Forward Rock</DialogTitle>
          </DialogHeader>
          {rollResult ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600">Rock rolled forward successfully.</p>
              <Button
                onClick={() => {
                  setRollForwardOpen(false)
                  setRollResult(null)
                  window.location.href = `/groups/${groupId}/rocks/${rollResult}`
                }}
                className="w-full"
              >
                View New Rock
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will mark the current rock as &quot;Rolled Forward&quot; and create a copy in the target quarter with all milestones.
              </p>
              <div className="space-y-2">
                <Label>Target Quarter</Label>
                <Select value={targetQuarterId} onValueChange={setTargetQuarterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {futureQuarters.map((q: any) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.label} {q.is_current ? '(Current)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRollForward} className="w-full" disabled={!targetQuarterId}>
                Roll Forward
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
