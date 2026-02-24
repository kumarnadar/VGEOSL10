'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mutate } from 'swr'

interface RockCardProps {
  rock: any
  groupId: string
  readOnly?: boolean
}

export function RockCard({ rock, groupId, readOnly = false }: RockCardProps) {
  const supabase = createClient()

  const totalMilestones = rock.milestones?.length || 0
  const doneMilestones = rock.milestones?.filter((m: any) => m.status === 'done').length || 0

  async function toggleStatus() {
    const newStatus = rock.status === 'on_track' ? 'off_track' : 'on_track'
    await supabase
      .from('rocks')
      .update({ status: newStatus })
      .eq('id', rock.id)
    mutate(`rocks-${groupId}-${rock.quarter_id}`)
  }

  return (
    <Card className="card-hover animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link href={`/groups/${groupId}/rocks/${rock.id}`} className="hover:underline">
            <CardTitle className="text-base">{rock.title}</CardTitle>
          </Link>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleStatus}
              className="shrink-0"
            >
              <Badge
                variant="outline"
                className={rock.status === 'on_track'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'}
              >
                {rock.status === 'on_track' ? 'On Track' : 'Off Track'}
              </Badge>
            </Button>
          )}
          {readOnly && (
            <Badge
              variant="outline"
              className={rock.status === 'on_track'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'}
            >
              {rock.status === 'on_track' ? 'On Track' : 'Off Track'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{rock.owner?.full_name || 'Unassigned'}</span>
          <span>
            {totalMilestones > 0
              ? `${doneMilestones}/${totalMilestones} milestones`
              : 'No milestones'}
          </span>
        </div>
        {totalMilestones > 0 && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(doneMilestones / totalMilestones) * 100}%` }}
            />
          </div>
        )}
        {rock.completion !== 'in_progress' && (
          <Badge variant="outline" className="mt-2">
            {rock.completion === 'done' ? 'Done' : rock.completion === 'not_done' ? 'Not Done' : 'Rolled Forward'}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
