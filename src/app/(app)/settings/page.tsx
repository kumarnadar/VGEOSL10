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
import { AuditTab } from '@/components/settings/audit-tab'
import { NotificationToggle } from '@/components/settings/notification-toggle'

export default function SettingsPage() {
  const supabase = createClient()

  const { data: groups, isLoading: groupsLoading } = useSWR('all-groups-with-templates', async () => {
    const { data } = await supabase
      .from('groups')
      .select('id, name, show_zoho_crm, scorecard_templates(id)')
      .order('name')
    return (data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      hasTemplate: (g.scorecard_templates?.length || 0) > 0,
      showZohoCrm: !!g.show_zoho_crm,
    })) as { id: string; name: string; hasTemplate: boolean; showZohoCrm: boolean }[]
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
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-8 mt-6">
            <NotificationToggle />
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

          <TabsContent value="audit" className="mt-6">
            <AuditTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
