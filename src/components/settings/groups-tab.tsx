'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { UserPicker } from '@/components/user-picker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

function EditGroupDialog({
  group,
  open,
  onOpenChange,
}: {
  group: any
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: group.name,
    description: group.description || '',
    geography: group.geography || 'US',
    cadence: group.meeting_cadence || 'weekly',
    meetingDay: group.meeting_day ?? 4,
    showZohoCrm: group.show_zoho_crm || false,
  })

  async function handleSave() {
    setLoading(true)
    const { error } = await supabase
      .from('groups')
      .update({
        name: form.name,
        description: form.description,
        geography: form.geography,
        meeting_cadence: form.cadence,
        meeting_day: form.meetingDay,
        show_zoho_crm: form.showZohoCrm,
      })
      .eq('id', group.id)
    setLoading(false)
    if (error) {
      toast.error('Failed to update group')
    } else {
      toast.success('Group updated')
      onOpenChange(false)
      mutate('admin-groups')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Geography</Label>
            <Select value={form.geography} onValueChange={(v) => setForm((p) => ({ ...p, geography: v }))}>
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
            <Select value={form.cadence} onValueChange={(v) => setForm((p) => ({ ...p, cadence: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Meeting Day</Label>
            <Select value={String(form.meetingDay)} onValueChange={(v) => setForm((p) => ({ ...p, meetingDay: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Zoho CRM on Dashboard</Label>
            <Switch
              checked={form.showZohoCrm}
              onCheckedChange={(v) => setForm((p) => ({ ...p, showZohoCrm: v }))}
            />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={loading || !form.name}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function GroupsTab() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [geography, setGeography] = useState('US')
  const [cadence, setCadence] = useState('weekly')
  const [editingGroup, setEditingGroup] = useState<any | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: groups } = useSWR('admin-groups', async () => {
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(id, user_id, role_in_group, profiles(full_name))')
      .order('name')
    return data || []
  })

  async function handleCreate() {
    const { error } = await supabase.from('groups').insert({ name, description, geography, meeting_cadence: cadence })
    if (error) {
      toast.error('Failed to create group')
      return
    }
    toast.success('Group created')
    setName('')
    setDescription('')
    mutate('admin-groups')
  }

  async function addMember(groupId: string, userId: string) {
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role_in_group: 'member' })
    if (error) {
      toast.error('Failed to add member')
      return
    }
    toast.success('Member added')
    mutate('admin-groups')
  }

  async function removeMember(membershipId: string) {
    const { error } = await supabase.from('group_members').delete().eq('id', membershipId)
    if (error) {
      toast.error('Failed to remove member')
      return
    }
    toast.success('Member removed')
    mutate('admin-groups')
  }

  async function handleDeleteGroup() {
    if (!deletingGroup) return
    setDeleting(true)
    // Remove all members first, then delete group
    const { error: membersError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', deletingGroup.id)
    if (membersError) {
      toast.error('Failed to remove group members')
      setDeleting(false)
      return
    }
    const { error } = await supabase.from('groups').delete().eq('id', deletingGroup.id)
    setDeleting(false)
    if (error) {
      toast.error('Failed to delete group')
    } else {
      toast.success(`Group "${deletingGroup.name}" deleted`)
      setDeletingGroup(null)
      mutate('admin-groups')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Groups</h2>
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
              <h3 className="font-semibold">{group.name}</h3>
              <p className="text-sm text-muted-foreground">{group.description} | {group.geography} | {group.meeting_cadence} | {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][group.meeting_day ?? 4]}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditingGroup(group)}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingGroup(group)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
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

      {editingGroup && (
        <EditGroupDialog
          group={editingGroup}
          open={!!editingGroup}
          onOpenChange={(open) => { if (!open) setEditingGroup(null) }}
        />
      )}

      <AlertDialog open={!!deletingGroup} onOpenChange={(open) => { if (!open) setDeletingGroup(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingGroup?.name}</strong> and remove all
              member assignments. Scorecard data and other records linked to this group will not
              be deleted but may lose their group association. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
