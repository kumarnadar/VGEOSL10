'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Pencil, X } from 'lucide-react'
import { useState } from 'react'

interface GroupMembership {
  id: string
  group_id: string
  role_in_group: string
  groups: { id: string; name: string } | null
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  geography: string | null
  role: string
  is_active: boolean
  group_members: GroupMembership[]
}

interface GroupOption {
  id: string
  name: string
}

function InviteDialog({ groups }: { groups: GroupOption[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    groupId: '',
    roleInGroup: 'member',
    systemRole: 'team_member',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleInvite() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to send invite')
      } else {
        setForm({ fullName: '', email: '', phone: '', groupId: '', roleInGroup: 'member', systemRole: 'team_member' })
        setOpen(false)
        mutate('admin-users')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="jane@company.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+1 555-0123" />
          </div>
          <div className="space-y-2">
            <Label>Group *</Label>
            <Select value={form.groupId} onValueChange={(val) => updateField('groupId', val)}>
              <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role in Group</Label>
              <Select value={form.roleInGroup} onValueChange={(val) => updateField('roleInGroup', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>System Role</Label>
              <Select value={form.systemRole} onValueChange={(val) => updateField('systemRole', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="group_admin">Group Admin</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="system_admin">System Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleInvite} className="w-full" disabled={loading || !form.fullName || !form.email || !form.groupId}>
            {loading ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  user,
  groups,
  open,
  onOpenChange,
}: {
  user: UserProfile
  groups: GroupOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: user.full_name,
    phone: user.phone || '',
    geography: user.geography || '',
    role: user.role,
    isActive: user.is_active,
  })

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setLoading(true)
    await supabase
      .from('profiles')
      .update({
        full_name: form.fullName,
        phone: form.phone || null,
        geography: form.geography || null,
        role: form.role,
        is_active: form.isActive,
      })
      .eq('id', user.id)
    setLoading(false)
    onOpenChange(false)
    mutate('admin-users')
  }

  async function addToGroup(groupId: string) {
    await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
      role_in_group: 'member',
    })
    mutate('admin-users')
  }

  async function removeFromGroup(membershipId: string) {
    await supabase.from('group_members').delete().eq('id', membershipId)
    mutate('admin-users')
  }

  const userGroupIds = user.group_members
    .filter((gm) => gm.groups)
    .map((gm) => gm.group_id)
  const availableGroups = groups.filter((g) => !userGroupIds.includes(g.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+1 555-0123" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Geography</Label>
              <Select value={form.geography} onValueChange={(val) => updateField('geography', val)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="UAE">UAE</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(val) => updateField('role', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="group_admin">Group Admin</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="system_admin">System Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(val) => updateField('isActive', val)} />
          </div>

          <div className="space-y-2">
            <Label>Groups</Label>
            <div className="space-y-1">
              {user.group_members
                .filter((gm) => gm.groups)
                .map((gm) => (
                  <div key={gm.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                    <span>{gm.groups!.name} ({gm.role_in_group})</span>
                    <button onClick={() => removeFromGroup(gm.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
            {availableGroups.length > 0 && (
              <Select onValueChange={(val) => addToGroup(val)}>
                <SelectTrigger><SelectValue placeholder="Add to group..." /></SelectTrigger>
                <SelectContent>
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button onClick={handleSave} className="w-full" disabled={loading || !form.fullName}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function UsersTab() {
  const supabase = createClient()
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

  const { data: users } = useSWR('admin-users', async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, group_members(id, group_id, role_in_group, groups(id, name))')
      .order('full_name')
    return (data || []) as UserProfile[]
  })

  const { data: groups } = useSWR('all-groups', async () => {
    const { data } = await supabase
      .from('groups')
      .select('id, name')
      .order('name')
    return (data || []) as GroupOption[]
  })

  const roleLabels: Record<string, string> = {
    team_member: 'Team Member',
    group_admin: 'Group Admin',
    executive: 'Executive',
    system_admin: 'System Admin',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users</h2>
        <InviteDialog groups={groups || []} />
      </div>

      <div className="table-striped">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Geography</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || '-'}</TableCell>
                <TableCell>{user.geography || '-'}</TableCell>
                <TableCell>{roleLabels[user.role] || user.role}</TableCell>
                <TableCell>
                  {user.group_members
                    .filter((gm) => gm.groups)
                    .map((gm) => gm.groups!.name)
                    .join(', ') || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'default' : 'destructive'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          groups={groups || []}
          open={!!editingUser}
          onOpenChange={(open) => { if (!open) setEditingUser(null) }}
        />
      )}
    </div>
  )
}
