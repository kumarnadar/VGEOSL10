'use client'

import { useParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { BarChart3, Plus, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useCampaigns, useCampaignMetrics } from '@/hooks/use-campaigns'
import { useScorecardSettings } from '@/hooks/use-scorecard'
import { ScorecardTimeHeader } from '@/components/scorecard/scorecard-time-header'
import { CampaignGrid } from '@/components/scorecard/campaign-grid'
import { CreateCampaignDialog } from '@/components/scorecard/create-campaign-dialog'
import { TableSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { mutate } from 'swr'

export default function CampaignsPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const supabase = createClient()
  const { user } = useUser()

  const { data: campaigns, isLoading } = useCampaigns(groupId)
  const { data: settings } = useScorecardSettings(groupId)
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [weekEndings, setWeekEndings] = useState<string[]>([])

  const activeCampaigns = campaigns?.filter((c: any) => c.status === 'active') || []
  const archivedCampaigns = campaigns?.filter((c: any) => c.status === 'archived') || []
  const displayCampaigns = showArchived ? archivedCampaigns : activeCampaigns

  const handleArchive = useCallback(async (campaignId: string) => {
    await supabase
      .from('campaigns')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', campaignId)
    mutate(`campaigns-${groupId}`)
    if (selectedCampaign === campaignId) setSelectedCampaign(null)
  }, [supabase, groupId, selectedCampaign])

  const handleReactivate = useCallback(async (campaignId: string) => {
    await supabase
      .from('campaigns')
      .update({ status: 'active', archived_at: null })
      .eq('id', campaignId)
    mutate(`campaigns-${groupId}`)
  }, [supabase, groupId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Campaigns</h1>
        </div>

        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="scorecard" asChild>
              <Link href={`/groups/${groupId}/scorecard`}>Pipeline</Link>
            </TabsTrigger>
            <TabsTrigger value="campaigns" asChild>
              <Link href={`/groups/${groupId}/scorecard/campaigns`}>Campaigns</Link>
            </TabsTrigger>
            <TabsTrigger value="dashboard" asChild>
              <Link href={`/groups/${groupId}/scorecard/dashboard`}>Dashboard</Link>
            </TabsTrigger>
            <TabsTrigger value="settings" asChild>
              <Link href={`/groups/${groupId}/scorecard/settings`}>Settings</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button size="sm" variant={showArchived ? 'outline' : 'default'} onClick={() => setShowArchived(false)}>
            Active ({activeCampaigns.length})
          </Button>
          <Button size="sm" variant={showArchived ? 'default' : 'outline'} onClick={() => setShowArchived(true)}>
            Archived ({archivedCampaigns.length})
          </Button>
        </div>
        {!showArchived && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Button>
        )}
      </div>

      {/* Campaign list */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : displayCampaigns.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title={showArchived ? 'No archived campaigns' : 'No active campaigns'}
          description={showArchived
            ? 'Archived campaigns will appear here.'
            : 'Create your first campaign to start tracking outreach metrics.'
          }
        />
      ) : (
        <div className="space-y-3">
          {displayCampaigns.map((campaign: any, idx: number) => (
            <div
              key={campaign.id}
              className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                selectedCampaign === campaign.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
              }`}
              onClick={() => setSelectedCampaign(
                selectedCampaign === campaign.id ? null : campaign.id
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{idx + 1}.</span>
                  <span className="font-medium">{campaign.name}</span>
                  <Badge
                    variant="outline"
                    className={campaign.status === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                    }
                  >
                    {campaign.status}
                  </Badge>
                  {campaign.leads_count_total && (
                    <span className="text-sm text-muted-foreground">
                      {campaign.leads_count_total} leads
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {campaign.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleArchive(campaign.id) }}
                      title="Archive campaign"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleReactivate(campaign.id) }}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected campaign grid */}
      {selectedCampaign && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Weekly Data: {displayCampaigns.find((c: any) => c.id === selectedCampaign)?.name}
            </h2>
          </div>
          <ScorecardTimeHeader
            weekEndingDay={settings?.week_ending_day}
            onWeekEndingsChange={setWeekEndings}
          />
          <CampaignGrid
            campaignId={selectedCampaign}
            groupId={groupId}
            weekEndings={weekEndings}
            readOnly={showArchived}
          />
        </div>
      )}

      {/* Create campaign dialog */}
      <CreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groupId={groupId}
      />
    </div>
  )
}
