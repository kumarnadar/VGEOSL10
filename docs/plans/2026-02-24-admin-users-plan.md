# Admin Users Enhancement -- Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full admin user management -- server-side invite with group assignment, edit/disable users, middleware enforcement for deactivated accounts.

**Architecture:** Next.js API route (`/api/admin/invite`) using Supabase service role key for server-side invite. Enhanced admin users page with SWR data fetching, edit dialog, and group management. Middleware check on `profiles.is_active` to block deactivated users.

**Tech Stack:** Next.js 16 (App Router), Supabase JS v2, SWR, shadcn/ui (Dialog, Select, Switch, Badge, Table), Tailwind CSS

**Design doc:** `docs/plans/2026-02-24-admin-users-design.md`

---

### Task 1: Database -- Add phone column to profiles

**Files:**
- SQL via Supabase SQL Editor (no file)
- Reference: `docs/plans/2026-02-24-admin-users-design.md`

**Step 1: Run SQL in Supabase SQL Editor**

Go to https://supabase.com/dashboard/project/lcnepordyzenssljlebp/sql/new and run:

```sql
ALTER TABLE profiles ADD COLUMN phone text;
```

**Step 2: Verify column exists**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'phone';
```

Expected: 1 row, `phone | text | YES`

---

### Task 2: Add shadcn Switch component

**Files:**
- Create: `src/components/ui/switch.tsx`

**Step 1: Install Switch component**

```bash
cd /c/Work/VG/Products/EOSApp/eos-app && npx shadcn@latest add switch
```

**Step 2: Verify file created**

```bash
ls src/components/ui/switch.tsx
```

Expected: File exists.

**Step 3: Commit**

```bash
git add src/components/ui/switch.tsx
git commit -m "chore: add shadcn Switch component for admin users"
```

---

### Task 3: Create server-side invite API route

**Files:**
- Create: `src/app/api/admin/invite/route.ts`
- Reference: `src/lib/supabase/server.ts` (for cookie-based server client pattern)

**Step 1: Create the API route**

Create `src/app/api/admin/invite/route.ts` with the following:

```typescript
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // 1. Parse request body
  const body = await request.json()
  const { email, fullName, phone, groupId, roleInGroup, systemRole } = body

  if (!email || !fullName) {
    return NextResponse.json(
      { success: false, error: 'Email and full name are required' },
      { status: 400 }
    )
  }

  // 2. Authenticate the calling user via cookie (must be system_admin)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only in API route
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'system_admin') {
    return NextResponse.json(
      { success: false, error: 'Only system admins can invite users' },
      { status: 403 }
    )
  }

  // 3. Create admin client with service role key
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 4. Invite user via admin API
  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    })

  if (inviteError) {
    return NextResponse.json(
      { success: false, error: inviteError.message },
      { status: 500 }
    )
  }

  const newUserId = inviteData.user.id

  // 5. Update profile with additional fields (phone, role)
  // The on_auth_user_created trigger creates the profile row automatically.
  // We update it with extra fields.
  const profileUpdates: Record<string, string> = {}
  if (phone) profileUpdates.phone = phone
  if (systemRole && systemRole !== 'team_member') profileUpdates.role = systemRole

  if (Object.keys(profileUpdates).length > 0) {
    // Use admin client to bypass RLS (the new user's profile was just created)
    await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', newUserId)
  }

  // 6. Add to group if specified
  if (groupId) {
    await adminClient.from('group_members').insert({
      group_id: groupId,
      user_id: newUserId,
      role_in_group: roleInGroup || 'member',
    })
  }

  return NextResponse.json({ success: true, userId: newUserId })
}
```

**Step 2: Verify the route compiles**

```bash
cd /c/Work/VG/Products/EOSApp/eos-app && npx next build 2>&1 | head -30
```

Expected: No TypeScript errors for the new route file.

**Step 3: Commit**

```bash
git add src/app/api/admin/invite/route.ts
git commit -m "feat: add server-side admin invite API route with service role key"
```

---

### Task 4: Rewrite admin users page -- enhanced table with groups and status

**Files:**
- Modify: `src/app/(app)/admin/users/page.tsx`
- Reference: `src/components/ui/badge.tsx`, `src/components/ui/table.tsx`

This task replaces the entire admin users page. The new page has:
- Enhanced SWR query that joins profiles -> group_members -> groups
- Table with columns: Name | Email | Phone | Geography | Role | Groups | Status | Actions
- Status shown as Badge (green "Active" / red "Inactive")
- Groups shown as comma-separated names
- Edit button in Actions column (dialog wired in Task 5)
- Invite button calls API route (wired in Task 6)

**Step 1: Rewrite the admin users page**

Replace the entire content of `src/app/(app)/admin/users/page.tsx` with:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Users, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { UserPicker } from '@/components/user-picker'

// Types
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

// ─── Invite Dialog ───────────────────────────────────────────────

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

// ─── Edit User Dialog ────────────────────────────────────────────

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

  // Group management
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

          {/* Group memberships */}
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

// ─── Main Page ───────────────────────────────────────────────────

export default function AdminUsersPage() {
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
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Users</h1>
        </div>
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
```

**Step 2: Verify build compiles**

```bash
cd /c/Work/VG/Products/EOSApp/eos-app && npx next build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

**Step 3: Commit**

```bash
git add src/app/\(app\)/admin/users/page.tsx
git commit -m "feat: rewrite admin users page with enhanced table, invite, and edit dialogs"
```

---

### Task 5: Middleware -- block deactivated users

**Files:**
- Modify: `src/lib/supabase/middleware.ts` (lines 28-38)

**Step 1: Add is_active check to middleware**

After the existing `getUser()` call (line 28) and before the unauthenticated redirect (line 30), add the deactivation check. The updated `updateSession` function should be:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Block deactivated users
  if (
    user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()

    if (profile && !profile.is_active) {
      // Sign out the deactivated user
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('deactivated', 'true')
      // Build a new response that clears cookies
      const redirectResponse = NextResponse.redirect(url)
      // Clear all supabase auth cookies
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith('sb-')) {
          redirectResponse.cookies.delete(cookie.name)
        }
      })
      return redirectResponse
    }
  }

  return supabaseResponse
}
```

**Step 2: Verify build compiles**

```bash
cd /c/Work/VG/Products/EOSApp/eos-app && npx next build 2>&1 | tail -20
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat: block deactivated users in middleware with is_active check"
```

---

### Task 6: Login page -- show deactivation message

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Step 1: Add deactivated message to login page**

Add `useSearchParams` to detect the `?deactivated=true` query parameter and display a warning banner. Changes needed:

1. Add import: `import { useSearchParams } from 'next/navigation'`
2. Inside `LoginPage` component, after existing state declarations, add:
   ```typescript
   const searchParams = useSearchParams()
   const isDeactivated = searchParams.get('deactivated') === 'true'
   ```
3. In both mobile and desktop card sections, above the `<LoginForm>` component, add:
   ```tsx
   {isDeactivated && (
     <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
       Your account has been deactivated. Contact your administrator.
     </div>
   )}
   ```

**Step 2: Verify build compiles**

```bash
cd /c/Work/VG/Products/EOSApp/eos-app && npx next build 2>&1 | tail -20
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add "src/app/(auth)/login/page.tsx"
git commit -m "feat: show deactivation message on login page"
```

---

### Task 7: Add SUPABASE_SERVICE_ROLE_KEY to Vercel

**Files:** None (Vercel dashboard)

**Step 1: Add environment variable in Vercel**

Go to https://vercel.com > VGEOSL10 project > Settings > Environment Variables.

Add:
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- Value: (copy from `.env.local` or `Keys.txt`)
- Environments: Production, Preview, Development

**Step 2: Trigger redeploy**

Push a commit or trigger manual redeploy from Vercel dashboard.

---

### Task 8: Manual smoke test

**Step 1: Test invite flow**

1. Log in as system_admin (Kumar)
2. Go to Admin > Users
3. Click "Invite User"
4. Fill in: Name, Email (use a test email), Phone, Group, Roles
5. Click "Send Invite"
6. Verify: success (no error), user appears in table, check email for invite link

**Step 2: Test edit flow**

1. Click Edit (pencil icon) on any user
2. Change geography, phone, toggle active status
3. Click "Save Changes"
4. Verify: table updates with new values

**Step 3: Test group management in edit dialog**

1. Click Edit on a user
2. Add user to a group via dropdown
3. Remove user from a group via X button
4. Verify: Groups column in table reflects changes

**Step 4: Test deactivation enforcement**

1. Edit a test user and toggle Active to OFF, save
2. In a separate browser/incognito, log in as that user
3. Verify: redirected to /login?deactivated=true with warning message
4. Re-enable the user from admin page

**Step 5: Verify existing functionality still works**

1. Admin > Groups page still functions
2. Role changes still work (now via edit dialog instead of inline dropdown)
3. All other pages unaffected
