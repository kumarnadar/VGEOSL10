'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useUserPreferences } from '@/hooks/use-user-preferences'
import { useTheme } from 'next-themes'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { User, Palette, Bell, Upload } from 'lucide-react'
import { toast } from 'sonner'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ProfilePage() {
  const { user } = useUser()
  const supabase = createClient()

  if (!user) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <User className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">My Profile</h1>
      </div>

      <ProfileSection user={user} />
      <AppearanceSection userId={user.id} />
      <NotificationsSection userId={user.id} />
    </div>
  )
}

function ProfileSection({ user }: { user: any }) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    geography: user.geography || '',
  })

  const avatarUrl = user.avatar_url
  const initials = user.full_name ? getInitials(user.full_name) : (user.email?.[0] || '?').toUpperCase()

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        geography: form.geography || null,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile updated')
      mutate('user')
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max 2MB.')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload avatar')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id)

    setUploading(false)
    if (updateError) {
      toast.error('Failed to save avatar URL')
    } else {
      toast.success('Avatar updated')
      mutate('user')
    }
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h2 className="text-lg font-semibold">Profile</h2>

      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-semibold">
              {initials}
            </div>
          )}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">Max 2MB, JPG/PNG</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user.email} disabled className="bg-muted" />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555-0123" />
        </div>
        <div className="space-y-2">
          <Label>Geography</Label>
          <Select value={form.geography} onValueChange={(v) => setForm((p) => ({ ...p, geography: v }))}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="India">India</SelectItem>
              <SelectItem value="UAE">UAE</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={saving || !form.full_name}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

function AppearanceSection({ userId }: { userId: string }) {
  const { preferences, savePreferences } = useUserPreferences(userId)
  const { theme, setTheme } = useTheme()

  async function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
    setTheme(newTheme)
    try {
      await savePreferences({ theme: newTheme })
    } catch {
      toast.error('Failed to save theme preference')
    }
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Appearance</h2>
      </div>

      <div className="flex gap-2">
        {(['light', 'dark', 'system'] as const).map((t) => (
          <Button
            key={t}
            variant={theme === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleThemeChange(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>
    </div>
  )
}

function NotificationsSection({ userId }: { userId: string }) {
  const { preferences, savePreferences } = useUserPreferences(userId)

  async function handleChange(field: string, value: any) {
    try {
      await savePreferences({ [field]: value })
      toast.success('Preference saved')
    } catch {
      toast.error('Failed to save preference')
    }
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Notifications</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Notification delivery will be enabled in a future update.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Preferred Channel</Label>
          <Select value={preferences.notification_channel} onValueChange={(v) => handleChange('notification_channel', v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Pre-Meeting Reminder</Label>
          <Select value={preferences.meeting_reminder_timing} onValueChange={(v) => handleChange('meeting_reminder_timing', v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1_day">1 Day Before</SelectItem>
              <SelectItem value="1_hour">1 Hour Before</SelectItem>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Scorecard Entry Reminder</Label>
          <Switch
            checked={preferences.scorecard_reminder_enabled}
            onCheckedChange={(v) => handleChange('scorecard_reminder_enabled', v)}
          />
        </div>
      </div>
    </div>
  )
}
