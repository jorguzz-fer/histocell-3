'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Search, X, Plus, ChevronDown } from 'lucide-react'
import type { Servico } from '@/app/(dashboard)/pedidos/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const CATEGORIA_CORES: Record<string, string> = {
  'Macroscopia':          'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'Processamento':        'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  'Criostato':            'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'Cortes Histológico':   'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  'Cortes Eppendorf':     'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  'Colorações':           'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  'Coloração Específica': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'Imunohistoquímica':    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'Imunofluorescência':   'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  'Citologia':            'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  'Análises':             'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  'Laudos':               'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  'Imagem':               'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
}

function categoriaBadge(cat: string) {
  return CATEGORIA_CORES[cat] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}

// ─── component ────────────────────────────────────────────────────────────────

interface ServicoSearchInputProps {
  servicos: Servico[]
  value: string           // servicoId selecionado (string)
  onChange: (servicoId: string, servico: Servico | null) => void
  isPesquisador?: boolean // determina qual preço exibir
  onCriarNovo?: (nome: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ServicoSearchInput({
  servicos,
  value,
  onChange,
  isPesquisador = false,
  onCriarNovo,
  disabled = false,
  placeholder = 'Buscar serviço pelo código ou nome…',
}: ServicoSearchInputProps) {
  const [open, setOpen]           = useState(false)
  const [query, setQuery]         = useState('')
  const [categoria, setCategoria] = useState('')
  const containerRef              = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => servicos.find((s) => String(s.id) === value) ?? null,
    [servicos, value],
  )

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Foca o input quando abre
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery('')
  }, [open])

  // Categorias únicas
  const categorias = useMemo(
    () => [...new Set(servicos.map((s) => s.categoria))].sort(),
    [servicos],
  )

  // Filtro de resultados
  const results = useMemo(() => {
    const q = normalize(query)
    return servicos
      .filter((s) => {
        if (categoria && s.categoria !== categoria) return false
        if (!q) return true
        return (
          normalize(s.nome).includes(q) ||
          s.codigo.includes(q) ||
          (s.codigoLegado && String(s.codigoLegado).includes(q))
        )
      })
      .slice(0, 60) // máx 60 resultados visíveis
  }, [servicos, query, categoria])

  function select(s: Servico) {
    onChange(String(s.id), s)
    setOpen(false)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('', null)
    setQuery('')
  }

  const priceLabel = (s: Servico) => {
    const preco = isPesquisador ? s.precoPesquisa : s.precoRotina
    return fmtBRL(preco || s.precoBase)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-[13px] text-left
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
          ${disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
      >
        <div className="flex-1 min-w-0">
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${categoriaBadge(selected.categoria)}`}>
                {selected.categoria.split('/')[0].split(' ')[0]}
              </span>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">{selected.codigo}</span>
              <span className="text-slate-800 dark:text-slate-200 truncate">{selected.nome}</span>
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              role="button"
              onClick={clear}
              className="p-0.5 rounded text-slate-300 hover:text-slate-500 dark:hover:text-slate-300"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 dark:border-slate-700
          bg-white dark:bg-slate-900 shadow-xl overflow-hidden">

          {/* Busca */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Código ou nome do serviço…"
              className="flex-1 text-[13px] bg-transparent text-slate-800 dark:text-slate-200
                placeholder:text-slate-400 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}>
                <X className="h-3 w-3 text-slate-300 hover:text-slate-500" />
              </button>
            )}
          </div>

          {/* Filtro de categoria */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setCategoria('')}
              className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                !categoria
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas
            </button>
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat === categoria ? '' : cat)}
                className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                  categoria === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.split('/')[0]}
              </button>
            ))}
          </div>

          {/* Resultados */}
          <div className="max-h-64 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Nenhum serviço encontrado
                </p>
                {onCriarNovo && query && (
                  <button
                    type="button"
                    onClick={() => { onCriarNovo(query); setOpen(false) }}
                    className="mt-2 flex items-center gap-1 mx-auto text-[12px] font-medium text-blue-600 dark:text-blue-400
                      hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar "{query}" como novo serviço
                  </button>
                )}
              </div>
            ) : (
              <>
                {results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => select(s)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left
                      hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
                      ${String(s.id) === value ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                  >
                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${categoriaBadge(s.categoria)}`}>
                      {s.categoria.split('/')[0].substring(0, 8)}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0 w-10 text-right">
                      {s.codigo}
                    </span>
                    <span className="flex-1 text-[12px] text-slate-700 dark:text-slate-300 truncate">
                      {s.nome}
                    </span>
                    <span className="shrink-0 text-[12px] font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                      {priceLabel(s)}
                    </span>
                  </button>
                ))}
                {results.length === 60 && (
                  <p className="px-3 py-2 text-[11px] text-slate-400 text-center border-t border-slate-100 dark:border-slate-800">
                    Refine a busca para ver mais resultados
                  </p>
                )}
              </>
            )}
          </div>

          {/* Criar novo */}
          {onCriarNovo && (
            <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2">
              <button
                type="button"
                onClick={() => { onCriarNovo(query); setOpen(false) }}
                className="flex items-center gap-1.5 text-[12px] font-medium text-blue-600 dark:text-blue-400
                  hover:text-blue-700 dark:hover:text-blue-300 transition-colors w-full"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar novo serviço{query ? ` "${query}"` : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
