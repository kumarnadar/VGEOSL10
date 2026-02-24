'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { user, signOut, isLoading } = useUser()
  const pathname = usePathname()

  if (isLoading || !user) return null

  const groups = user.group_members?.map((gm: any) => gm.groups) || []
  const isAdmin = user.role === 'system_admin'

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-primary">EOS L10</h1>
        <p className="text-xs text-muted-foreground">Platform</p>
        <p className="mt-1 text-sm text-muted-foreground">{user.full_name || user.email}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <Link
            href="/dashboard"
            className={cn(
              'block rounded-md px-3 py-2 text-sm',
              pathname === '/dashboard'
                ? 'bg-sidebar-accent font-medium border-l-2 border-primary'
                : 'hover:bg-sidebar-accent'
            )}
          >
            Dashboard
          </Link>
        </div>

        {groups.map((group: any) => (
          <div key={group.id}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
              {group.name}
            </p>
            {[
              { href: `/groups/${group.id}/rocks`, label: 'Rocks' },
              { href: `/groups/${group.id}/focus`, label: 'Focus Tracker' },
              { href: `/groups/${group.id}/issues`, label: 'Issues & To-Dos' },
              { href: `/groups/${group.id}/meetings`, label: 'Meetings' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm',
                  pathname.startsWith(item.href)
                    ? 'bg-sidebar-accent font-medium border-l-2 border-primary'
                    : 'hover:bg-sidebar-accent'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        <div>
          <Link
            href="/rock-ideas"
            className={cn(
              'block rounded-md px-3 py-2 text-sm',
              pathname === '/rock-ideas'
                ? 'bg-sidebar-accent font-medium border-l-2 border-primary'
                : 'hover:bg-sidebar-accent'
            )}
          >
            Rock Ideas
          </Link>
        </div>

        {isAdmin && (
          <div>
            <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
              Admin
            </p>
            {[
              { href: '/admin/users', label: 'Users' },
              { href: '/admin/groups', label: 'Groups' },
              { href: '/admin/quarters', label: 'Quarters' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm',
                  pathname === item.href
                    ? 'bg-sidebar-accent font-medium border-l-2 border-primary'
                    : 'hover:bg-sidebar-accent'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t p-4 flex items-center gap-3">
        <Image src="/vg-logo.svg" alt="Value Global" width={24} height={24} />
        <Button variant="ghost" className="flex-1 justify-start text-sm" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
