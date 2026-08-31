'use client'

import { useEffect, useState, useCallback } from 'react'
import { Inbox, AlertTriangle, Microscope, Layers, FileCheck, Scissors, Palette, PackageCheck, Truck, ClipboardList, ChevronRight, List, LayoutGrid, FlaskConical, Archive, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ClienteAvatar } from '@/components/ui/ClienteAvatar'
import { OSModal } from '@/components/OSModal'
import { clienteCor } from '@/lib/clienteVisual'
import { codigoCurtoPedido, codigoCurtoOS } from '@/lib/pedido'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { clienteDaOS, nomeClienteDaOS, type FilaResponse, type FilaOS, type FilaPedidoPendente } from './types'
import { rotuloAvanco } from '@/lib/proximoPasso'

const ETAPA_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  triagem:       { label: 'Triagem / Recebidas',   icon: ClipboardList, color: 'text-slate-500' },
  macroscopia:   { label: 'Macroscopia',           icon: Microscope,    color: 'text-blue-600' },
  processamento: { label: 'Processamento / Inclusão', icon: Layers,     color: 'text-indigo-600' },
  microtomia:    { label: 'Microtomia (Corte)',    icon: Scissors,      color: 'text-cyan-600' },
  coloracao:     { label: 'Coloração / Montagem',  icon: Palette,       color: 'text-fuchsia-600' },
  imunofluorescencia: { label: 'Imunofluorescência', icon: FlaskConical, color: 'text-violet-600' },
  laudo:         { label: 'Laudo',                 icon: FileCheck,     color: 'text-emerald-600' },
  finalizacao:   { label: 'Finalização',           icon: PackageCheck,  color: 'text-amber-600' },
  expedicao:     { label: 'Expedição / Retirada',  icon: Truck,         color: 'text-green-600' },
  arquivamento:  { label: 'Arquivamento',          icon: Archive,       color: 'text-slate-500' },
  descarte:      { label: 'Descarte',              icon: Trash2,        color: 'text-rose-600' },
}

// Destinos da ação "Mover para", na ordem do fluxo (espelha ETAPAS_FILA do back).
const MOVER_DESTINOS = [
  'triagem', 'macroscopia', 'processamento', 'microtomia', 'coloracao',
  'imunofluorescencia', 'laudo', 'finalizacao', 'expedicao', 'arquivamento', 'descarte',
]
// Destinos terminais: mover para eles conclui a OS.
const ETAPAS_TERMINAIS = ['arquivamento', 'descarte']

function fmtData(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// Cor única e estável por cliente (mesma cor em todas as telas) — pedido do Célio.

export default function FilaPage() {
  const user = useCurrentUser()
  const [soMeus, setSoMeus] = useState(false)
  const [data, setData] = useState<FilaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  // Layout da fila: 'lista' (barras empilhadas) ou 'colunas' (kanban vertical,
  // lado a lado — pedido do Célio para ver todas as etapas de uma vez).
  const [layout, setLayout] = useState<'lista' | 'colunas'>('lista')
  // OS aberta no modal (a partir do link no item da fila).
  const [osModal, setOsModal] = useState<{ pedidoId: number; numero: string } | null>(null)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('fila-layout') : null
    if (saved === 'colunas' || saved === 'lista') setLayout(saved)
  }, [])

  function mudarLayout(l: 'lista' | 'colunas') {
    setLayout(l)
    try { window.localStorage.setItem('fila-layout', l) } catch { /* ignora */ }
  }

  const load = useCallback(() => {
    setLoading(true)
    const qs = soMeus ? '?soMeus=true' : ''
    api.get<FilaResponse>(`/fila${qs}`)
      .then(setData)
      .catch(() => toast.error('Erro ao carregar fila'))
      .finally(() => setLoading(false))
  }, [soMeus])

  useEffect(() => { load() }, [load])

  async function aprovarDivergencia(pedidoId: number) {
    try {
      await api.patch(`/pedidos/${pedidoId}/aprovar-divergencia`, {})
      toast.success('Divergência aprovada')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao aprovar')
    }
  }

  async function avancarOS(osId: number) {
    try {
      await api.patch(`/ordens/${osId}/avancar`, {})
      toast.success('Etapa avançada')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao avançar etapa')
    }
  }

  async function moverOS(osId: number, etapa: string) {
    try {
      await api.patch(`/ordens/${osId}/mover`, { etapa })
      const terminou = ETAPAS_TERMINAIS.includes(etapa)
      toast.success(terminou
        ? `Item enviado para ${ETAPA_META[etapa]?.label ?? etapa} (OS concluída)`
        : `Item movido para ${ETAPA_META[etapa]?.label ?? etapa}`)
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao mover item')
    }
  }

  const isGerencia = user?.role === 'gerencia'

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="h-6 w-6" /> Fila
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Itens em andamento por etapa do laboratório
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Alternador de layout: barras empilhadas × colunas (kanban vertical) */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => mudarLayout('lista')}
              title="Barras empilhadas"
              className={`p-1.5 ${layout === 'lista' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => mudarLayout('colunas')}
              title="Colunas (kanban)"
              className={`p-1.5 ${layout === 'colunas' ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={soMeus}
              onChange={(e) => setSoMeus(e.target.checked)}
              className="rounded border-slate-300"
            />
            Só meus
          </label>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Carregando…</p>}

      {data && (
        <div className="space-y-5">
          {isGerencia && data.secoes.aprovacaoDivergencia.length > 0 && (
            <SecaoDivergencia
              itens={data.secoes.aprovacaoDivergencia}
              onAprovar={aprovarDivergencia}
            />
          )}

          <div className={layout === 'colunas' ? 'flex gap-4 overflow-x-auto pb-2 items-start' : 'space-y-5'}>
            {(data.etapas ?? []).map((etapa) => (
              <div key={etapa} className={layout === 'colunas' ? 'shrink-0 w-72' : ''}>
                <SecaoOS
                  etapa={etapa}
                  itens={data.secoes[etapa] ?? []}
                  count={data.counts[etapa] ?? 0}
                  onAvancar={avancarOS}
                  onMover={moverOS}
                  onVerOS={(pedidoId, numero) => setOsModal({ pedidoId, numero })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <OSModal
        open={osModal != null}
        pedidoId={osModal?.pedidoId ?? null}
        osNumero={osModal?.numero}
        onClose={() => setOsModal(null)}
      />
    </div>
  )
}

function SecaoDivergencia({ itens, onAprovar }: { itens: FilaPedidoPendente[]; onAprovar: (id: number) => void }) {
  return (
    <section className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-amber-200 dark:border-amber-700/50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
          Aguardando aprovação de divergência
        </h2>
        <Badge variant="amber" className="ml-auto">{itens.length}</Badge>
      </div>
      <div className="divide-y divide-amber-200 dark:divide-amber-700/30">
        {itens.map((p) => (
          <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100" title={p.numero}>{p.codigoCurto ?? codigoCurtoPedido(p.seq, p.numero)}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                {p.clienteNome} · Orçado <strong>{p.totalOrcado}</strong> · Recebido <strong>{p.totalRecebido}</strong> · {fmtData(p.dataRecebimento)}
              </p>
            </div>
            <Button size="sm" onClick={() => onAprovar(p.id)}>Aprovar divergência</Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function SecaoOS({ etapa, itens, count, onAvancar, onMover, onVerOS }: { etapa: string; itens: FilaOS[]; count: number; onAvancar: (id: number) => void; onMover: (id: number, destino: string) => void; onVerOS: (pedidoId: number, numero: string) => void }) {
  const meta = ETAPA_META[etapa] ?? { label: etapa, icon: ClipboardList, color: 'text-slate-500' }
  const Icon = meta.icon
  // Colunas terminais (Arquivamento/Descarte) listam itens já concluídos ali —
  // sem ações de avançar/mover.
  const terminal = ETAPAS_TERMINAIS.includes(etapa)
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
        <Icon className={`h-4 w-4 ${meta.color}`} />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{meta.label}</h2>
        <Badge variant="slate" className="ml-auto">{count}</Badge>
      </div>
      {itens.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12px] text-slate-400">
          {terminal ? 'Nada aqui.' : 'Nada nessa etapa.'}
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {itens.map((o) => {
            // A OS da Entrada não tem amostra nem pedido — só cliente e volumes.
            // Tudo que depende da amostra é opcional daqui para baixo.
            const cliente = clienteDaOS(o)
            const nomeCliente = nomeClienteDaOS(o)
            const pedido = o.amostra?.pedido ?? null
            const volumes = o._count?.volumes ?? 0
            return (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-3 border-l-4"
              style={{ borderLeftColor: cliente ? clienteCor(cliente.id).borda : 'transparent' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <ClienteAvatar nome={nomeCliente} seed={cliente?.id ?? nomeCliente} size={30} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                    {pedido ? (
                      <button
                        onClick={() => onVerOS(pedido.id, o.numero)}
                        title={`Ver Ordem de Serviço · ${o.numero}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                      >
                        {codigoCurtoOS(o.seq, o.numero)}
                      </button>
                    ) : (
                      // Sem pedido não há o que abrir no modal — o código fica
                      // como texto, e a OS se identifica pelos volumes.
                      <span title={o.numero}>{codigoCurtoOS(o.seq, o.numero)}</span>
                    )}
                    {o.amostra
                      ? `${' · '}Amostra ${o.amostra.numeroInterno}${o.amostra.numeroCliente ? ` (${o.amostra.numeroCliente})` : ''}`
                      : ` · ${volumes} volume${volumes === 1 ? '' : 's'} · aguardando identificação`}
                    {o._count?.itens === 0 && (
                      <span
                        className="ml-2 inline-flex"
                        title="Sem serviço definido, esta OS fica fora da cobrança do mês — defina na tela Ordem de Serviço."
                      >
                        <Badge variant="amber">sem serviço</Badge>
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {pedido && (
                      <>
                        <span title={pedido.numero}>{codigoCurtoPedido(pedido.seq, pedido.numero)}</span>
                        {' · '}
                      </>
                    )}
                    {nomeCliente}
                    {o.amostra ? ` · ${o.amostra.especie} · ${o.amostra.material}` : ' · entrada da recepção'}
                    {o.responsavel ? ` · ${o.responsavel}` : ''}
                  </p>
                </div>
              </div>
              {!terminal && (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {/* Avanço nomeado (plano "O próximo passo"): quem olha a fila
                      sabe para onde o item vai, não só que ele "avança". */}
                  <Button size="sm" variant="secondary" onClick={() => onAvancar(o.id)}>
                    {rotuloAvanco(etapa)} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                  {/* Mover para: desvios (Imunofluorescência) e terminais (Arquivo/Descarte) */}
                  <select
                    aria-label="Mover para"
                    value=""
                    onChange={(e) => {
                      const destino = e.target.value
                      if (!destino) return
                      const label = ETAPA_META[destino]?.label ?? destino
                      if (ETAPAS_TERMINAIS.includes(destino) &&
                        !window.confirm(`Enviar para ${label}? Isso conclui a OS ${o.numero}.`)) {
                        e.target.value = ''
                        return
                      }
                      onMover(o.id, destino)
                      e.target.value = ''
                    }}
                    className="text-[11px] rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 px-1.5 py-1"
                  >
                    <option value="">Mover para…</option>
                    {MOVER_DESTINOS.filter((d) => d !== etapa).map((d) => (
                      <option key={d} value={d}>{ETAPA_META[d]?.label ?? d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
