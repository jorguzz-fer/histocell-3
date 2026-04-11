'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { PedidoDrawer } from './PedidoDrawer'
import type { Pedido, PedidoListResponse } from './types'

// ─── status config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; variant: 'slate' | 'blue' | 'green' | 'rose' | 'amber' }> = {
  rascunho:  { label: 'Rascunho',  variant: 'slate' },
  enviado:   { label: 'Enviado',   variant: 'blue'  },
  recebido:  { label: 'Recebido',  variant: 'green' },
  cancelado: { label: 'Cancelado', variant: 'rose'  },
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const [pedidos, setPedidos]       = useState<Pedido[]>([])
  const [meta, setMeta]             = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [page, setPage]             = useState(1)
  const [limit, setLimit]           = useState(20)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── fetch ────────────────────────────────────────────────────────────────────

  const fetchPedidos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await api.get<PedidoListResponse>(`/pedidos?${params}`)
      setPedidos(res.data)
      setMeta(res.meta)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }, [busca, filtroStatus, page, limit])

  // reset page on filter change
  useEffect(() => { setPage(1) }, [busca, filtroStatus, limit])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchPedidos, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchPedidos])

  // ── ações ────────────────────────────────────────────────────────────────────

  function abrirNovo() {
    setPedidoSelecionado(null)
    setDrawerOpen(true)
  }

  function abrirEditar(p: Pedido) {
    setPedidoSelecionado(p)
    setDrawerOpen(true)
  }

  async function confirmarDelete(p: Pedido) {
    if (p.status !== 'rascunho') {
      toast.error('Apenas pedidos em rascunho podem ser excluídos.')
      return
    }
    setConfirmDeleteId(p.id)
  }

  async function executarDelete(id: number) {
    setDeletingId(id)
    try {
      await api.delete(`/pedidos/${id}`)
      toast.success('Pedido excluído com sucesso!')
      setConfirmDeleteId(null)
      fetchPedidos()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir pedido')
    } finally {
      setDeletingId(null)
    }
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        subtitle="Gerencie os pedidos de análise dos clientes"
        action={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo pedido
          </Button>
        }
      />

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por número ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-64 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[13px]
            bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="text-[13px] rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5
            bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="enviado">Enviado</option>
          <option value="recebido">Recebido</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <span className="text-[12px] text-slate-400 ml-auto">
          {meta.total} pedido{meta.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="h-6 w-6 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum pedido encontrado</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {busca || filtroStatus
                ? 'Tente ajustar os filtros.'
                : 'Clique em "Novo pedido" para começar.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                  <tr>
                    {['Número', 'Cliente', 'Status', 'Serviços', 'Total', 'Data', ''].map((h) => (
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
                  {pedidos.map((p) => {
                    const st = statusConfig[p.status] ?? { label: p.status, variant: 'slate' as const }
                    const isConfirmingDelete = confirmDeleteId === p.id
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Número */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => abrirEditar(p)}
                            className="text-[13px] font-mono font-medium text-blue-600 dark:text-blue-400
                              hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                          >
                            {p.numero}
                          </button>
                        </td>

                        {/* Cliente */}
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-tight">
                            {p.clienteNomeFantasia ?? p.clienteNome}
                          </div>
                          {p.clienteNomeFantasia && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                              {p.clienteNome}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>

                        {/* Serviços */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[13px] text-slate-600 dark:text-slate-400 tabular-nums">
                            {p.totalItens}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                            {fmtBRL(p.valorTotal)}
                          </span>
                        </td>

                        {/* Data */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-[12px] text-slate-500 dark:text-slate-400">
                            {fmtDate(p.createdAt)}
                          </div>
                          {p.dataRecebimento && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Recebido {fmtDate(p.dataRecebimento)}
                            </div>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {isConfirmingDelete ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[12px] text-slate-500 dark:text-slate-400">Excluir?</span>
                              <Button
                                size="sm"
                                variant="danger"
                                loading={deletingId === p.id}
                                onClick={() => executarDelete(p.id)}
                              >
                                Confirmar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                                Não
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => abrirEditar(p)}
                                title="Editar"
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100
                                  dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {p.status === 'rascunho' && (
                                <button
                                  onClick={() => confirmarDelete(p)}
                                  title="Excluir"
                                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50
                                    dark:hover:bg-rose-500/10 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => abrirEditar(p)}
                                title="Ver detalhes"
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100
                                  dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">

              {/* Info + por página */}
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
                    {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>por página</span>
                </label>
              </div>

              {/* Botões de página */}
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

      {/* Drawer */}
      <PedidoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pedido={pedidoSelecionado}
        onSaved={fetchPedidos}
      />
    </div>
  )
}
