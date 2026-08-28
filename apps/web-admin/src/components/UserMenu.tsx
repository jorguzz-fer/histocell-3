'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, KeyRound, LogOut, Route } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { iniciais } from '@/lib/clienteVisual'

export type UsuarioLogado = {
  nome?: string
  email?: string
  role?: string
}

const PAPEL_LABEL: Record<string, string> = {
  gerencia: 'Gerência',
  recepcao: 'Recepção',
  tecnico: 'Técnico',
  financeiro: 'Financeiro',
}

/** Mesma altura/alinhamento para todos os itens do menu. */
const ITEM =
  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 transition-all'

/**
 * Área do usuário no topo direito: avatar com as iniciais e um menu com o que
 * é da conta (tema, senha, sair) — antes espalhado no rodapé do menu lateral —
 * mais o mapa do fluxo, que é consulta e não faz parte da operação do dia.
 */
export function UserMenu({ usuario }: { usuario: UsuarioLogado | null }) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Navegar fecha o menu (o Link não desmonta este componente).
  useEffect(() => setAberto(false), [pathname])

  useEffect(() => {
    if (!aberto) return
    const onClique = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false)
    }
    const onTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', onClique)
    document.addEventListener('keydown', onTecla)
    return () => {
      document.removeEventListener('mousedown', onClique)
      document.removeEventListener('keydown', onTecla)
    }
  }, [aberto])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const nome = usuario?.nome?.trim() || 'Usuário'
  const papel = usuario?.role ? (PAPEL_LABEL[usuario.role] ?? usuario.role) : null

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu do usuário"
        className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors ${
          aberto
            ? 'bg-slate-100 dark:bg-slate-800'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[12px] font-semibold leading-none text-white select-none"
          aria-hidden
        >
          {iniciais(nome)}
        </span>
        <span className="hidden sm:block max-w-[140px] truncate text-[13px] font-medium text-slate-700 dark:text-slate-300">
          {nome}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{nome}</p>
            {usuario?.email && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{usuario.email}</p>
            )}
            {papel && (
              <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {papel}
              </span>
            )}
          </div>

          <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

          <ThemeToggle className={ITEM} />

          <Link href="/mapa" className={ITEM} role="menuitem">
            <Route className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} />
            <span>Mapa do fluxo</span>
          </Link>

          <Link href="/trocar-senha" className={ITEM} role="menuitem">
            <KeyRound className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} />
            <span>Trocar senha</span>
          </Link>

          <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

          <button type="button" onClick={handleLogout} className={ITEM} role="menuitem">
            <LogOut className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  )
}
