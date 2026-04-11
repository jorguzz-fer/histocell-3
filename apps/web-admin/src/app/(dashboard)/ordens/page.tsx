'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { NovaOSDrawer } from './NovaOSDrawer'
import type { OrdemServico, OrdensListResponse } from './types'

// ─── config ───────────────────────────────────────────────────────────────────

const ETAPAS = ['triagem', 'macroscopia', 'processamento', 'laudo'] as const

const statusOS: Record<string, { label: string; variant: 'slate' | 'amber' | 'blue' | 'green' | 'rose' }> = {
  fila:         { label: 'Na fila',      variant: 'slate' },
  em_andamento: { label: 'Em andamento', variant: 'blue'  },
  concluida:    { label: 'Concluída',    variant: 'green' },
  cancelada:    { label: 'Cancelada',    variant: 'rose'  },
}

const etapaLabel: Record<string, string> = {
  triagem:       'Triagem',
  macroscopia:   'Macroscopia',
  processamento: 'Processamento',
  laudo:         'Laudo',
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

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ─── Progress bar de etapas ───────────────────────────────────────────────────

function EtapaProgress({ etapas, etapaAtual, status }: {
  etapas: OrdemServico['etapas']
  etapaAtual: string
  status: string
}) {
  return (
    <div className="flex items-center gap-0.5">
      {ETAPAS.map((e, i) => {
        const record = etapas.find((et) => et.etapa === e)
        const concluida = record?.status === 'concluida'
        const atual     = e === etapaAtual && status !== 'concluida' && status !== 'cancelada'
        const futura    = !concluida && !atual

        return (
          <div key={e} className="flex items-center gap-0.5">
            <div
              title={etapaLabel[e]}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                concluida  ? 'bg-emerald-500' :
                atual      ? 'bg-blue-500' :
                status === 'concluida' ? 'bg-emerald-500' :
                'bg-slate-200 dark:bg-slate-700'
              }`}
            />
            {i < ETAPAS.length - 1 && (
              <div className="w-px h-1.5 bg-slate-200 dark:bg-slate-700" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

export default function OrdensPage() {
  const [ordens, setOrdens]           = useState<OrdemServico[]>([])
  const [meta, setMeta]               = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading]         = useState(true)
  const [busca, setBusca]             = useState('')
  const [filtroStatus, setFiltroStatus]     = useState('')
  const [filtroEtapa, setFiltroEtapa]       = useState('')
  const [filtroUrgente, setFiltroUrgente]   = useState(false)
  const [page, setPage]               = useState(1)
  const [limit, setLimit]             = useState(20)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [avancandoId, setAvancandoId] = useState<number | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── fetch ─────────────────────────────────────────────────────────────────────

  const fetchOrdens = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroEtapa) params.set('etapa', filtroEtapa)
      if (filtroUrgente) params.set('prioridade', 'urgente')
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await api.get<OrdensListResponse>(`/ordens?${params}`)
      setOrdens(res.data)
      setMeta(res.meta)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar ordens')
    } finally {
      setLoading(false)
    }
  }, [busca, filtroStatus, filtroEtapa, filtroUrgente, page, limit])

  useEffect(() => { setPage(1) }, [busca, filtroStatus, filtroEtapa, filtroUrgente, limit])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchOrdens, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchOrdens])

  // ── avancar etapa ─────────────────────────────────────────────────────────────

  async function avancarEtapa(os: OrdemServico) {
    setAvancandoId(os.id)
    try {
      await api.patch(`/ordens/${os.id}/avancar`, {})
      toast.success(
        os.etapaAtual === 'laudo'
          ? `OS ${os.numero} concluída!`
          : `OS ${os.numero} avançada para ${etapaLabel[
              ETAPAS[ETAPAS.indexOf(os.etapaAtual as typeof ETAPAS[number]) + 1]
            ] ?? ''}`,
      )
      fetchOrdens()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao avançar etapa')
    } finally {
      setAvancandoId(null)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Fluxo analítico das amostras no laboratório"
        action={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova OS
          </Button>
        }
      />

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar OS, amostra ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-60 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[13px]
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
          <option value="fila">Na fila</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>

        <select
          value={filtroEtapa}
          onChange={(e) => setFiltroEtapa(e.target.value)}
          className="text-[13px] rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5
            bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Todas as etapas</option>
          <option value="triagem">Triagem</option>
          <option value="macroscopia">Macroscopia</option>
          <option value="processamento">Processamento</option>
          <option value="laudo">Laudo</option>
        </select>

        <button
          onClick={() => setFiltroUrgente((v) => !v)}
          className={`flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-md border transition-colors ${
            filtroUrgente
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Urgentes
        </button>

        <span className="text-[12px] text-slate-400 ml-auto">
          {meta.total} OS{meta.total !== 1 ? '' : ''}
        </span>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="h-6 w-6 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : ordens.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma OS encontrada</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {busca || filtroStatus || filtroEtapa || filtroUrgente
                ? 'Tente ajustar os filtros.'
                : 'Clique em "Nova OS" para criar a primeira.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                  <tr>
                    {['OS', 'Amostra', 'Cliente', 'Progresso', 'Etapa atual', 'Status', 'Responsável', 'Data', ''].map((h) => (
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
                  {ordens.map((os) => {
                    const st = statusOS[os.status] ?? { label: os.status, variant: 'slate' as const }
                    const isAvancando = avancandoId === os.id
                    const podeAvancar = os.status !== 'concluida' && os.status !== 'cancelada'

                    return (
                      <tr
                        key={os.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* OS número */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {os.prioridade === 'urgente' && (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            )}
                            <span className="text-[12px] font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {os.numero}
                            </span>
                          </div>
                        </td>

                        {/* Amostra */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-[12px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {os.amostra.numeroInterno}
                          </div>
                          <div className="text-[11px] text-slate-400 capitalize mt-0.5">
                            {os.amostra.especie} · {labelMaterial(os.amostra.material)}
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="px-4 py-3">
                          <div className="text-[13px] text-slate-700 dark:text-slate-300 leading-tight">
                            {os.amostra.pedido.cliente.nomeFantasia ?? os.amostra.pedido.cliente.nome}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {os.amostra.pedido.numero}
                          </div>
                        </td>

                        {/* Progresso */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <EtapaProgress
                            etapas={os.etapas}
                            etapaAtual={os.etapaAtual}
                            status={os.status}
                          />
                        </td>

                        {/* Etapa atual */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {os.status === 'concluida' ? (
                            <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">Concluída</span>
                          ) : os.status === 'cancelada' ? (
                            <span className="text-[12px] text-slate-400">Cancelada</span>
                          ) : (
                            <span className="text-[12px] text-slate-700 dark:text-slate-300">
                              {etapaLabel[os.etapaAtual] ?? os.etapaAtual}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>

                        {/* Responsável */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[12px] text-slate-500 dark:text-slate-400">
                            {os.responsavel ?? '—'}
                          </span>
                        </td>

                        {/* Data */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-[12px] text-slate-500 dark:text-slate-400">
                            {fmtDate(os.createdAt)}
                          </div>
                          {os.concluidoEm && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Concl. {fmtDate(os.concluidoEm)}
                            </div>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {podeAvancar && (
                              <Button
                                size="sm"
                                variant={os.etapaAtual === 'laudo' ? 'primary' : 'secondary'}
                                loading={isAvancando}
                                onClick={() => avancarEtapa(os)}
                              >
                                {os.etapaAtual === 'laudo' ? 'Concluir' : 'Avançar'}
                              </Button>
                            )}
                            <button
                              title="Detalhes"
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100
                                dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
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

      <NovaOSDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchOrdens}
      />
    </div>
  )
}
