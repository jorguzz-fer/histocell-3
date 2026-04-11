'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Inbox, FlaskConical, Pencil, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import { ReceberDrawer } from './ReceberDrawer'
import type { PedidoFila, Amostra, AmostraListResponse } from './types'

// ─── config ───────────────────────────────────────────────────────────────────

const statusAmostra: Record<string, { label: string; variant: 'amber' | 'blue' | 'green' | 'rose' }> = {
  pendente:        { label: 'Pendente',        variant: 'amber' },
  em_processamento:{ label: 'Processando',     variant: 'blue'  },
  concluida:       { label: 'Concluída',       variant: 'green' },
  rejeitada:       { label: 'Rejeitada',       variant: 'rose'  },
}

const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: 'pendente',         label: 'Pendente' },
  { value: 'em_processamento', label: 'Processando' },
  { value: 'concluida',        label: 'Concluída' },
  { value: 'rejeitada',        label: 'Rejeitada' },
]

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function labelMaterial(m: string) {
  const MAP: Record<string, string> = {
    biopsia_incisional: 'Biópsia Incisional',
    biopsia_excisional: 'Biópsia Excisional',
    peca_cirurgica:     'Peça Cirúrgica',
    citologia:          'Citologia',
    necropsia:          'Necrópsia',
    outro:              'Outro',
  }
  return MAP[m] ?? m
}

// ─── component ────────────────────────────────────────────────────────────────

export default function RecebimentoPage() {
  // Fila
  const [fila, setFila]             = useState<PedidoFila[]>([])
  const [loadingFila, setLoadingFila] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoFila | null>(null)

  // Amostras
  const [amostras, setAmostras]         = useState<Amostra[]>([])
  const [meta, setMeta]                 = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loadingAmostras, setLoadingAmostras] = useState(true)
  const [busca, setBusca]               = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [page, setPage]                 = useState(1)
  const [limit, setLimit]               = useState(20)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── fetches ──────────────────────────────────────────────────────────────────

  const fetchFila = useCallback(async () => {
    setLoadingFila(true)
    try {
      const data = await api.get<PedidoFila[]>('/recebimento/fila')
      setFila(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar fila')
    } finally {
      setLoadingFila(false)
    }
  }, [])

  const fetchAmostras = useCallback(async () => {
    setLoadingAmostras(true)
    try {
      const params = new URLSearchParams()
      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)
      params.set('page', String(page))
      params.set('limit', String(limit))
      const res = await api.get<AmostraListResponse>(`/recebimento/amostras?${params}`)
      setAmostras(res.data)
      setMeta(res.meta)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar amostras')
    } finally {
      setLoadingAmostras(false)
    }
  }, [busca, filtroStatus, page, limit])

  useEffect(() => { setPage(1) }, [busca, filtroStatus, limit])

  useEffect(() => {
    fetchFila()
  }, [fetchFila])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAmostras, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchAmostras])

  function abrirReceber(p: PedidoFila) {
    setPedidoSelecionado(p)
    setDrawerOpen(true)
  }

  function onSaved() {
    fetchFila()
    fetchAmostras()
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recebimento"
        subtitle="Entrada e conferência de amostras no laboratório"
        action={
          <Button variant="secondary" onClick={() => { fetchFila(); fetchAmostras() }}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Atualizar
          </Button>
        }
      />

      {/* ── Fila de recebimento ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-slate-400" />
          <h2 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Aguardando recebimento
          </h2>
          {fila.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-semibold px-2 py-0.5">
              {fila.length}
            </span>
          )}
        </div>

        {loadingFila ? (
          <div className="flex justify-center py-8">
            <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : fila.length === 0 ? (
          <div className="rounded-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum pedido aguardando recebimento</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Pedidos com status "Enviado" aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fila.map((p) => {
              const diasNaFila = Math.floor(
                (Date.now() - new Date(p.dataEnvio ?? p.createdAt).getTime()) / 86400000,
              )
              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 space-y-3"
                >
                  {/* Header do card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {p.numero}
                      </p>
                      <p className="text-[12px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                        {p.clienteNomeFantasia ?? p.clienteNome}
                      </p>
                    </div>
                    {diasNaFila > 0 && (
                      <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        diasNaFila > 2
                          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        {diasNaFila}d na fila
                      </span>
                    )}
                  </div>

                  {/* Itens */}
                  <ul className="space-y-0.5">
                    {p.itens.slice(0, 3).map((it, i) => (
                      <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span className="truncate">{it.servico.nome}</span>
                        <span className="text-slate-400 shrink-0 ml-2">×{it.quantidade}</span>
                      </li>
                    ))}
                    {p.itens.length > 3 && (
                      <li className="text-[11px] text-slate-400">
                        +{p.itens.length - 3} serviço(s)
                      </li>
                    )}
                  </ul>

                  {/* Footer do card */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Enviado {fmtDate(p.dataEnvio)}
                    </span>
                    <Button size="sm" onClick={() => abrirReceber(p)}>
                      Receber
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Amostras registradas ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-slate-400" />
          <h2 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Amostras registradas
          </h2>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Buscar por número, pedido ou cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-64 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[13px]
              bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          <div className="w-48">
            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              options={STATUS_OPTS}
            />
          </div>
          <span className="text-[12px] text-slate-400 ml-auto">
            {meta.total} amostra{meta.total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabela de amostras */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
          {loadingAmostras ? (
            <div className="flex justify-center py-16">
              <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : amostras.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma amostra encontrada</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {busca || filtroStatus ? 'Tente ajustar os filtros.' : 'Amostras aparecerão aqui após o recebimento.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                    <tr>
                      {['Nº Interno', 'Pedido', 'Cliente', 'Espécie', 'Material', 'Status', 'Recebido em', ''].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {amostras.map((a) => {
                      const st = statusAmostra[a.status] ?? { label: a.status, variant: 'slate' as const }
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">

                          {/* Nº Interno */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[12px] font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {a.numeroInterno}
                            </span>
                            {a.numeroCliente && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Cliente: {a.numeroCliente}
                              </div>
                            )}
                          </td>

                          {/* Pedido */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[12px] font-mono text-slate-600 dark:text-slate-400">
                              {a.pedido.numero}
                            </span>
                          </td>

                          {/* Cliente */}
                          <td className="px-4 py-3">
                            <span className="text-[13px] text-slate-700 dark:text-slate-300">
                              {a.pedido.cliente.nomeFantasia ?? a.pedido.cliente.nome}
                            </span>
                          </td>

                          {/* Espécie */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[12px] capitalize text-slate-600 dark:text-slate-400">
                              {a.especie}
                            </span>
                          </td>

                          {/* Material */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[12px] text-slate-600 dark:text-slate-400">
                              {labelMaterial(a.material)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </td>

                          {/* Recebido em */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[12px] text-slate-500 dark:text-slate-400">
                              {fmtDateTime(a.dataRecebimento)}
                            </span>
                            {a.recebidoPor && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                por {a.recebidoPor}
                              </div>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              title="Ver / Editar"
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100
                                dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 text-[12px] text-slate-400 mr-auto">
                  <span>
                    Exibindo{' '}
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {meta.total === 0 ? 0 : (meta.page - 1) * limit + 1}
                    </span>
                    {' '}–{' '}
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {Math.min(meta.page * limit, meta.total)}
                    </span>
                    {' '}de{' '}
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {meta.total}
                    </span>
                  </span>
                  <label className="flex items-center gap-1.5">
                    <span>Exibir</span>
                    <select
                      value={limit}
                      onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
                      className="rounded border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[12px]
                        bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span>por página</span>
                  </label>
                </div>

                {meta.totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 2)
                      .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((item, i) =>
                        item === 'ellipsis' ? (
                          <span key={`e${i}`} className="px-2 text-[12px] text-slate-400">…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setPage(item as number)}
                            className={`min-w-[30px] h-[30px] rounded-md text-[12px] font-medium transition-colors ${
                              page === item
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )
                    }
                    <Button size="sm" variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>›</Button>
                    <Button size="sm" variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage(meta.totalPages)}>»</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Drawer */}
      <ReceberDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pedido={pedidoSelecionado}
        onSaved={onSaved}
      />
    </div>
  )
}
