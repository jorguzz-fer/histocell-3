'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Plus, Pencil, PowerOff, Power, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { ClienteDrawer } from './ClienteDrawer'
import type { Cliente, ClienteListResponse } from './types'

// ─── helpers ────────────────────────────────────────────────────────────────

const segmentoBadge: Record<string, { label: string; variant: 'blue' | 'purple' | 'amber' }> = {
  recorrente:  { label: 'Recorrente',  variant: 'blue'   },
  esporadico:  { label: 'Esporádico',  variant: 'amber'  },
  pesquisador: { label: 'Pesquisador', variant: 'purple' },
}

function fmtPhone(v?: string) {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return v
}

// ─── component ───────────────────────────────────────────────────────────────

export default function CadastroPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroSegmento, setFiltroSegmento] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)

  // Confirmar desativar
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toggling, setToggling] = useState(false)

  // ── fetch ──
  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busca) params.set('busca', busca)
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (filtroSegmento) params.set('segmento', filtroSegmento)
      if (mostrarInativos) params.set('ativo', 'false')
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await api.get<ClienteListResponse>(`/clientes?${params}`)
      setClientes(res.data)
      setMeta(res.meta)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }, [busca, filtroTipo, filtroSegmento, mostrarInativos, page, limit])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  // Debounce na busca
  const [buscaInput, setBuscaInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setBusca(buscaInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [buscaInput])

  // ── ações ──
  function abrirNovo() {
    setClienteSelecionado(null)
    setDrawerOpen(true)
  }

  function abrirEditar(c: Cliente) {
    setClienteSelecionado(c)
    setDrawerOpen(true)
  }

  async function toggleAtivo(c: Cliente) {
    setToggling(true)
    try {
      if (c.ativo) {
        await api.delete(`/clientes/${c.id}`)
        toast.success(`Cliente "${c.nomeFantasia || c.nome}" desativado.`)
      } else {
        await api.patch(`/clientes/${c.id}/reativar`, {})
        toast.success(`Cliente "${c.nomeFantasia || c.nome}" reativado.`)
      }
      await fetchClientes()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao alterar status')
    } finally {
      setToggling(false)
      setConfirmId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes e médicos solicitantes"
        action={
          <Button onClick={abrirNovo}>
            <Plus className="h-3.5 w-3.5" />
            Novo cliente
          </Button>
        }
      />

      {/* ── Barra de filtros ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card px-4 py-3 flex flex-wrap items-center gap-3 mb-4">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Buscar por nome, apelido ou e-mail..."
            className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-md border border-slate-200 dark:border-slate-700
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Tipo */}
        <select
          value={filtroTipo}
          onChange={(e) => { setFiltroTipo(e.target.value); setPage(1) }}
          className="text-[13px] rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5
            bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Todos os tipos</option>
          <option value="PJ">Pessoa Jurídica</option>
          <option value="PF">Pessoa Física</option>
        </select>

        {/* Segmento */}
        <select
          value={filtroSegmento}
          onChange={(e) => { setFiltroSegmento(e.target.value); setPage(1) }}
          className="text-[13px] rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5
            bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Todos os segmentos</option>
          <option value="recorrente">Recorrente</option>
          <option value="esporadico">Esporádico</option>
          <option value="pesquisador">Pesquisador</option>
        </select>

        {/* Toggle inativos */}
        <button
          onClick={() => { setMostrarInativos((v) => !v); setPage(1) }}
          className={`flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-md border transition-colors
            ${mostrarInativos
              ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {mostrarInativos ? 'Exibindo inativos' : 'Mostrar inativos'}
        </button>

        {/* Contador */}
        <span className="text-[12px] text-slate-400 ml-auto">
          {meta.total} cliente{meta.total !== 1 ? 's' : ''}
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
        ) : clientes.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum cliente encontrado</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {busca || filtroTipo || filtroSegmento ? 'Tente ajustar os filtros.' : 'Clique em "Novo cliente" para começar.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                  <tr>
                    {['#', 'Nome / Apelido', 'Documento', 'Contato', 'Segmento', 'Status', ''].map((h) => (
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
                  {clientes.map((c) => {
                    const seg = segmentoBadge[c.segmento] ?? { label: c.segmento, variant: 'slate' as const }
                    const isConfirming = confirmId === c.id
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                          !c.ativo ? 'opacity-50' : ''
                        }`}
                      >
                        {/* # */}
                        <td className="px-4 py-3 text-[12px] font-mono text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
                          #{c.id}
                        </td>

                        {/* Nome / Apelido — clicável pra editar */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => abrirEditar(c)}
                            className="text-left group"
                          >
                            <p className="text-[13px] font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {c.nomeFantasia || c.nome}
                            </p>
                            {c.nomeFantasia && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{c.nome}</p>
                            )}
                          </button>
                        </td>

                        {/* Documento */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={c.tipo === 'PJ' ? 'blue' : 'green'}>{c.tipo}</Badge>
                          <p className="text-[12px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                            {c.documentoMascarado}
                          </p>
                        </td>

                        {/* Contato */}
                        <td className="px-4 py-3">
                          <p className="text-[13px] text-slate-700 dark:text-slate-300">{c.email}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {fmtPhone(c.celular || c.telefone)}
                          </p>
                        </td>

                        {/* Segmento */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={seg.variant as any}>{seg.label}</Badge>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={c.ativo ? 'green' : 'slate'}>
                            {c.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isConfirming ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                                {c.ativo ? 'Desativar?' : 'Reativar?'}
                              </span>
                              <Button
                                size="sm"
                                variant={c.ativo ? 'danger' : 'primary'}
                                loading={toggling}
                                onClick={() => toggleAtivo(c)}
                              >
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmId(null)}
                              >
                                Não
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => abrirEditar(c)}
                                title="Editar"
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmId(c.id)}
                                title={c.ativo ? 'Desativar' : 'Reativar'}
                                className={`p-1.5 rounded-md transition-colors ${
                                  c.ativo
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                }`}
                              >
                                {c.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
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

                {/* Seletor de registros por página */}
                <label className="flex items-center gap-1.5">
                  <span>Exibir</span>
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
                    className="rounded border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[12px]
                      bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span>por página</span>
                </label>
              </div>

              {/* Botões de página */}
              {meta.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* Primeira */}
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(1)}>
                    «
                  </Button>
                  {/* Anterior */}
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    ‹
                  </Button>

                  {/* Números de página */}
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

                  {/* Próxima */}
                  <Button size="sm" variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                    ›
                  </Button>
                  {/* Última */}
                  <Button size="sm" variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage(meta.totalPages)}>
                    »
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Drawer */}
      <ClienteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cliente={clienteSelecionado}
        onSaved={fetchClientes}
      />
    </div>
  )
}
