'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { ClienteAvatar } from '@/components/ui/ClienteAvatar'
import { api } from '@/lib/api'
import type { Cliente, ClienteListResponse } from '@/app/(dashboard)/cadastro/types'

interface Props {
  /** Cliente selecionado (null = nenhum). */
  value: Cliente | null
  onChange: (cliente: Cliente | null) => void
  /** Abre o cadastro de cliente novo, já com o que foi digitado. */
  onCriarNovo?: (nome: string) => void
  label?: string
  placeholder?: string
  autoFocus?: boolean
}

/**
 * Busca de cliente com autocomplete, no mesmo espírito do ServicoSearchInput.
 * Consulta a API a cada digitação (debounce), porque a base de clientes cresce
 * e não cabe carregar tudo em memória como se faz com os serviços.
 */
export function ClienteSearchInput({
  value,
  onChange,
  onCriarNovo,
  label = 'Cliente',
  placeholder = 'Buscar por nome, apelido ou e-mail…',
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [resultados, setResultados] = useState<Cliente[]>([])
  const [buscando, setBuscando] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // fecha ao clicar fora
  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [])

  useEffect(() => {
    const termo = query.trim()
    if (termo.length < 2) {
      setResultados([])
      return
    }
    let cancelado = false
    setBuscando(true)
    const t = setTimeout(() => {
      api
        .get<ClienteListResponse>(`/clientes?busca=${encodeURIComponent(termo)}&limit=8`)
        .then((res) => {
          if (!cancelado) setResultados(res.data)
        })
        .catch(() => {
          if (!cancelado) setResultados([])
        })
        .finally(() => {
          if (!cancelado) setBuscando(false)
        })
    }, 250)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [query])

  function selecionar(c: Cliente) {
    onChange(c)
    setQuery('')
    setOpen(false)
  }

  // Já escolhido: vira um cartão com o cliente, e não uma caixa de texto — a
  // recepção precisa bater o olho e ter certeza de quem é antes de etiquetar.
  if (value) {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{label}</span>
        )}
        <div className="flex items-center gap-3 rounded-md border border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5">
          <ClienteAvatar nome={value.nomeFantasia ?? value.nome} seed={value.id} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
              {value.nomeFantasia ?? value.nome}
            </p>
            <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
              {value.nomeFantasia ? `${value.nome} · ` : ''}
              {value.documentoMascarado}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/60 hover:text-slate-700 dark:hover:bg-slate-800"
            title="Trocar cliente"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const termo = query.trim()

  return (
    <div className="flex flex-col gap-1" ref={boxRef}>
      {label && (
        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{label}</span>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-900 transition-colors placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />

        {open && termo.length >= 2 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {buscando && resultados.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-slate-500">Buscando…</p>
            )}

            {!buscando && resultados.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-slate-500">Nenhum cliente encontrado.</p>
            )}

            {resultados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selecionar(c)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60"
              >
                <ClienteAvatar nome={c.nomeFantasia ?? c.nome} seed={c.id} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                    {c.nomeFantasia ?? c.nome}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {c.nomeFantasia ? `${c.nome} · ` : ''}
                    {c.documentoMascarado}
                  </p>
                </div>
              </button>
            ))}

            {onCriarNovo && (
              <button
                type="button"
                onClick={() => {
                  onCriarNovo(termo)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-2 text-left text-[12px] font-medium text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-blue-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Cadastrar &ldquo;{termo}&rdquo; como cliente novo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
