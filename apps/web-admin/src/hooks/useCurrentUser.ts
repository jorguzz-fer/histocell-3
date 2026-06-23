'use client'

import { useEffect, useState } from 'react'

export type CurrentUser = {
  id: number
  nome: string
  email: string
  role: string
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null)
  useEffect(() => {
    const raw = localStorage.getItem('user')
    if (raw) {
      try { setUser(JSON.parse(raw)) } catch {}
    }
  }, [])
  return user
}
