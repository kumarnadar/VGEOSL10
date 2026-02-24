'use client'

import { useState } from 'react'
import type { ViewMode } from '@/components/view-toggle'

export function useViewPreference(key: string, defaultView: ViewMode): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return defaultView
    const stored = localStorage.getItem(key)
    return (stored === 'card' || stored === 'table') ? stored : defaultView
  })

  function setAndPersist(v: ViewMode) {
    setView(v)
    localStorage.setItem(key, v)
  }

  return [view, setAndPersist]
}
