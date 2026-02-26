'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsersTab } from '@/components/settings/users-tab'
import { QuartersTab } from '@/components/settings/quarters-tab'
import { GroupsTab } from '@/components/settings/groups-tab'
import { ScorecardTab } from '@/components/settings/scorecard-tab'
import { MeetingsTab } from '@/components/settings/meetings-tab'

export default function SettingsPage() {
  const supabase = createClient()

  const { data: groups, isLoading: groupsLoading } = useSWR('all-groups', async () => {
    const { data } = await supabase
      .from('groups')
      .select('id, name')
      .order('name')
    return (data || []) as { id: string; name: string }[]
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {groupsLoading ? (
        <div className="space-y-4 mt-6">
          <div className="h-10 w-80 rounded bg-muted animate-pulse" />
          <div className="h-6 w-full rounded bg-muted animate-pulse" />
          <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-6 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      ) : (
        <Tabs defaultValue="system">
          <TabsList>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-8 mt-6">
            <UsersTab />
            <div className="border-t pt-8">
              <QuartersTab />
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <GroupsTab />
          </TabsContent>

          <TabsContent value="scorecard" className="mt-6">
            <ScorecardTab groups={groups || []} />
          </TabsContent>

          <TabsContent value="meetings" className="mt-6">
            <MeetingsTab groups={groups || []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
