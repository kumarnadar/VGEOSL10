'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

interface UserPickerProps {
  value: string | null
  onChange: (userId: string | null, displayName: string) => void
  placeholder?: string
  allowFreeText?: boolean
}

export function UserPicker({ value, onChange, placeholder = 'Select user...', allowFreeText = false }: UserPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const { data: users } = useSWR('all-users', async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, geography')
      .eq('is_active', true)
      .order('full_name')
    return data || []
  })

  const selectedUser = users?.find((u: any) => u.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          {selectedUser ? selectedUser.full_name : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search users..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {allowFreeText && search ? (
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    onChange(null, search)
                    setOpen(false)
                  }}
                >
                  Add &quot;{search}&quot; as text
                </button>
              ) : (
                'No users found.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {users?.map((user: any) => (
                <CommandItem
                  key={user.id}
                  value={user.full_name}
                  onSelect={() => {
                    onChange(user.id, user.full_name)
                    setOpen(false)
                  }}
                >
                  <span>{user.full_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{user.geography}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
