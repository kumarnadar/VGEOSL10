'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { useUserPreferences } from '@/hooks/use-user-preferences'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
  BarChart3,
  User,
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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut, isLoading } = useUser()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  const [avatarError, setAvatarError] = useState(false)

  const groups = user?.group_members?.map((gm: any) => gm.groups) || []
  const isAdmin = user?.role === 'system_admin'

  // Sync theme from DB on mount
  const { preferences } = useUserPreferences(user?.id || null)
  useEffect(() => {
    if (preferences?.theme && preferences.theme !== theme) {
      setTheme(preferences.theme)
    }
  }, [preferences?.theme]) // eslint-disable-line react-hooks/exhaustive-deps

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
    { href: `/groups/${groupId}/rocks`, label: 'Rocks', icon: Target },
    { href: `/groups/${groupId}/scorecard`, label: 'Scorecard', icon: BarChart3 },
    { href: `/groups/${groupId}/focus`, label: 'Top 10', icon: ListChecks },
    { href: `/groups/${groupId}/issues`, label: 'Issues & To-Dos', icon: AlertCircle },
  ]

  const userDisplayName = user.full_name || user.email || ''
  const userInitials = user.full_name ? getInitials(user.full_name) : (user.email?.[0] || '?').toUpperCase()
  const avatarUrl = user.avatar_url

  return (
    <div className="flex h-full flex-col">
      {/* Header with user info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2.5">
          <Image src="/vg-mark.svg" alt="Value Global" width={28} height={28} className="shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-primary font-[family-name:var(--font-montserrat)] leading-tight">
              EOS L10
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Platform</p>
          </div>
        </div>
        <div className="mt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md px-1 py-1 hover:bg-sidebar-accent transition-colors">
                {avatarUrl && !avatarError ? (
                  <img src={avatarUrl} alt="Avatar" className="h-8 w-8 shrink-0 rounded-full object-cover" onError={() => setAvatarError(true)} />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {userInitials}
                  </div>
                )}
                <p className="text-sm text-muted-foreground truncate">{userDisplayName}</p>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/profile" onClick={onNavigate}>
                  <User className="h-4 w-4 mr-2" />
                  My Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 animate-stagger">
        {/* Dashboard */}
        <div className="animate-slide-in-left">
          <Link
            href="/dashboard"
            onClick={onNavigate}
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
                  onClick={onNavigate}
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
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              pathname === '/rock-ideas' ? activeClass : inactiveClass
            )}
          >
            <Lightbulb className="h-4 w-4" />
            Rock Ideas
          </Link>
        </div>

        {/* Settings (admin only) */}
        {isAdmin && (
          <div className="animate-slide-in-left">
            <Link
              href="/settings"
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                pathname === '/settings' ? activeClass : inactiveClass
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
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
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </div>
  )
}

/** Desktop sidebar -- always visible at lg+ breakpoint */
export function Sidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-sidebar">
      <SidebarContent />
    </aside>
  )
}

/** Mobile sidebar -- Sheet overlay, visible below lg breakpoint */
export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
