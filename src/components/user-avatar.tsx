'use client'

import { useState } from 'react'
import { getInitials } from '@/lib/utils'

interface UserAvatarProps {
  avatarUrl?: string | null
  name?: string | null
  email?: string | null
  size?: 'sm' | 'lg'
}

const sizeClasses = {
  sm: { container: 'h-8 w-8 shrink-0 text-xs', img: 'h-8 w-8 shrink-0' },
  lg: { container: 'h-16 w-16 text-lg', img: 'h-16 w-16' },
}

export function UserAvatar({ avatarUrl, name, email, size = 'sm' }: UserAvatarProps) {
  const [avatarError, setAvatarError] = useState(false)

  const initials = name
    ? getInitials(name)
    : (email?.[0] || '?').toUpperCase()

  const classes = sizeClasses[size]

  if (avatarUrl && !avatarError) {
    return (
      <img
        src={avatarUrl}
        alt="Avatar"
        className={`${classes.img} rounded-full object-cover`}
        onError={() => setAvatarError(true)}
      />
    )
  }

  return (
    <div
      className={`flex ${classes.container} items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold`}
    >
      {initials}
    </div>
  )
}
