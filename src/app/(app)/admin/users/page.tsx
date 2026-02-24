'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

export default function AdminUsersPage() {
  const supabase = createClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')

  const { data: users } = useSWR('admin-users', async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    return data || []
  })

  async function handleInvite() {
    const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
      data: { full_name: inviteName },
    })
    if (error) {
      // Fallback: use signInWithOtp for non-admin invites
      await supabase.auth.signInWithOtp({
        email: inviteEmail,
        options: {
          data: { full_name: inviteName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    }
    setInviteEmail('')
    setInviteName('')
  }

  async function updateRole(userId: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    mutate('admin-users')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Invite User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <Button onClick={handleInvite} className="w-full">Send Invite</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Geography</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user: any) => (
            <TableRow key={user.id}>
              <TableCell>{user.full_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.geography || '-'}</TableCell>
              <TableCell>
                <Select value={user.role} onValueChange={(val) => updateRole(user.id, val)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="group_admin">Group Admin</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="system_admin">System Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
