'use client'

import Link from 'next/link'
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
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      <div className="p-4 border-b">
        <h1 className="text-lg font-semibold">EOS L10</h1>
        <p className="text-sm text-muted-foreground">{user.full_name || user.email}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <Link
            href="/dashboard"
            className={cn(
              'block rounded-md px-3 py-2 text-sm',
              pathname === '/dashboard' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
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
                  pathname.startsWith(item.href) ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
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
              pathname === '/rock-ideas' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
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
                  pathname === item.href ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t p-4">
        <Button variant="ghost" className="w-full justify-start text-sm" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
