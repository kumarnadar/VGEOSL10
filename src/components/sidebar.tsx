'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  Calendar,
  ListChecks,
  Target,
  AlertCircle,
  Lightbulb,
  Users,
  Layers,
  CalendarDays,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Sidebar() {
  const { user, signOut, isLoading } = useUser()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  const groups = user?.group_members?.map((gm: any) => gm.groups) || []
  const isAdmin = user?.role === 'system_admin'

  const { data: groupMembers } = useSWR(
    user ? 'group-members' : null,
    async () => {
      const groupIds = groups.map((g: any) => g.id)
      if (groupIds.length === 0) return {}
      const { data } = await supabase
        .from('group_members')
        .select('group_id, profiles(full_name)')
        .in('group_id', groupIds)
      const map: Record<string, string[]> = {}
      data?.forEach((gm: any) => {
        if (!map[gm.group_id]) map[gm.group_id] = []
        const name = gm.profiles?.full_name || 'Unknown'
        map[gm.group_id].push(name)
      })
      return map
    }
  )

  if (isLoading || !user) return null

  const activeClass = 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
  const inactiveClass = 'hover:bg-sidebar-accent'

  const groupNavItems = (groupId: string) => [
    { href: `/groups/${groupId}/meetings`, label: 'Meetings', icon: Calendar },
    { href: `/groups/${groupId}/focus`, label: 'Top 10', icon: ListChecks },
    { href: `/groups/${groupId}/rocks`, label: 'Rocks', icon: Target },
    { href: `/groups/${groupId}/issues`, label: 'Issues & To-Dos', icon: AlertCircle },
  ]

  const userDisplayName = user.full_name || user.email || ''
  const userInitials = user.full_name ? getInitials(user.full_name) : (user.email?.[0] || '?').toUpperCase()

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar">
      {/* Header with user info */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-primary font-[family-name:var(--font-montserrat)]">
          EOS L10
        </h1>
        <p className="text-xs text-muted-foreground">Platform</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {userInitials}
          </div>
          <p className="text-sm text-muted-foreground truncate">{userDisplayName}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 animate-stagger">
        {/* Dashboard */}
        <div className="animate-slide-in-left">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              pathname === '/dashboard' ? activeClass : inactiveClass
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        {/* Groups */}
        {groups.map((group: any) => {
          const members = groupMembers?.[group.id] || []
          const visibleMembers = members.slice(0, 4)
          const overflow = members.length - 4

          return (
            <div key={group.id} className="animate-slide-in-left">
              <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground font-[family-name:var(--font-montserrat)]">
                {group.name}
              </p>
              {/* Group member initials */}
              {members.length > 0 && (
                <div className="mb-2 flex items-center gap-1 px-3">
                  {visibleMembers.map((name: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold"
                      title={name}
                    >
                      {getInitials(name)}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                      +{overflow}
                    </div>
                  )}
                </div>
              )}
              {groupNavItems(group.id).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                    pathname.startsWith(item.href) ? activeClass : inactiveClass
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )
        })}

        {/* Rock Ideas */}
        <div className="animate-slide-in-left">
          <Link
            href="/rock-ideas"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              pathname === '/rock-ideas' ? activeClass : inactiveClass
            )}
          >
            <Lightbulb className="h-4 w-4" />
            Rock Ideas
          </Link>
        </div>

        {/* Admin items (promoted to top-level, no section header) */}
        {isAdmin && (
          <div className="space-y-0 animate-slide-in-left">
            {[
              { href: '/admin/users', label: 'Users', icon: Users },
              { href: '/admin/groups', label: 'Groups', icon: Layers },
              { href: '/admin/quarters', label: 'Quarters', icon: CalendarDays },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                  pathname === item.href ? activeClass : inactiveClass
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 flex items-center gap-2">
        <Image src="/vg-logo.svg" alt="Value Global" width={24} height={24} />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <Button variant="ghost" className="flex-1 justify-start text-sm gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
