'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function NotificationToggle() {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/system')
      .then(res => res.json())
      .then(data => {
        setEnabled(data.notifications_enabled ?? true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleToggle(checked: boolean) {
    setEnabled(checked)
    try {
      const res = await fetch('/api/settings/system', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications_enabled: checked }),
      })
      if (!res.ok) throw new Error('Failed to update')
      if (checked) {
        toast.success('Notifications enabled', {
          description: 'The system will now send email notifications.',
        })
      } else {
        toast.warning('Notifications disabled', {
          description: 'All email notifications are now suppressed.',
        })
      }
    } catch {
      setEnabled(!checked) // revert on failure
      toast.error('Failed to update notification setting.')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Email Notifications</CardTitle>
            <CardDescription>
              Control whether the system sends email notifications (magic links, invites, reminders)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="notifications-toggle" className="sr-only">
              Toggle notifications
            </Label>
            <Switch
              id="notifications-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>
      </CardHeader>
      {!enabled && (
        <CardContent>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Notifications are disabled. No emails will be sent from the system.
          </div>
        </CardContent>
      )}
    </Card>
  )
}
