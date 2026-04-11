'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evita hydration mismatch — só renderiza o ícone real após montar no client
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 transition-all"
    >
      {mounted && isDark ? (
        <Sun className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} />
      ) : (
        <Moon className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} />
      )}
      <span>{mounted ? (isDark ? 'Modo claro' : 'Modo escuro') : 'Tema'}</span>
    </button>
  )
}
