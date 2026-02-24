'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { UserPicker } from '@/components/user-picker'
import { useState } from 'react'

export default function AdminGroupsPage() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [geography, setGeography] = useState('US')
  const [cadence, setCadence] = useState('weekly')

  const { data: groups } = useSWR('admin-groups', async () => {
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(id, user_id, role_in_group, profiles(full_name))')
      .order('name')
    return data || []
  })

  async function handleCreate() {
    await supabase.from('groups').insert({ name, description, geography, meeting_cadence: cadence })
    setName('')
    setDescription('')
    mutate('admin-groups')
  }

  async function addMember(groupId: string, userId: string, role: string = 'member') {
    await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role_in_group: role })
    mutate('admin-groups')
  }

  async function removeMember(membershipId: string) {
    await supabase.from('group_members').delete().eq('id', membershipId)
    mutate('admin-groups')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Groups</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., BDev" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Geography</Label>
                <Select value={geography} onValueChange={setGeography}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="UAE">UAE</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meeting Cadence</Label>
                <Select value={cadence} onValueChange={setCadence}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups?.map((group: any) => (
        <div key={group.id} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{group.name}</h2>
              <p className="text-sm text-muted-foreground">{group.description} | {group.geography} | {group.meeting_cadence}</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.group_members?.map((gm: any) => (
                <TableRow key={gm.id}>
                  <TableCell>{gm.profiles?.full_name}</TableCell>
                  <TableCell>{gm.role_in_group}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => removeMember(gm.id)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex gap-2">
            <UserPicker
              value={null}
              onChange={(userId) => {
                if (userId) addMember(group.id, userId)
              }}
              placeholder="Add member..."
            />
          </div>
        </div>
      ))}
    </div>
  )
}
