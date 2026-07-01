'use client'

import { useEffect, useState, useCallback } from 'react'
import { Inbox, AlertTriangle, Microscope, Layers, FileCheck, Scissors, Palette, PackageCheck, Truck, ClipboardList, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { FilaResponse, FilaOS, FilaPedidoPendente } from './types'

const ETAPA_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  triagem:       { label: 'Triagem / Recebidas',   icon: ClipboardList, color: 'text-slate-500' },
  macroscopia:   { label: 'Macroscopia',           icon: Microscope,    color: 'text-blue-600' },
  processamento: { label: 'Processamento / Inclusão', icon: Layers,     color: 'text-indigo-600' },
  microtomia:    { label: 'Microtomia (Corte)',    icon: Scissors,      color: 'text-cyan-600' },
  coloracao:     { label: 'Coloração / Montagem',  icon: Palette,       color: 'text-fuchsia-600' },
  laudo:         { label: 'Laudo',                 icon: FileCheck,     color: 'text-emerald-600' },
  finalizacao:   { label: 'Finalização',           icon: PackageCheck,  color: 'text-amber-600' },
  expedicao:     { label: 'Expedição / Retirada',  icon: Truck,         color: 'text-green-600' },
}

function fmtData(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// Cor estável por cliente (facilita a leitura da fila — pedido do Célio)
const CORES_CLIENTE = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#dc2626', '#65a30d', '#c026d3', '#0d9488']
function corCliente(nome: string) {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0
  return CORES_CLIENTE[h % CORES_CLIENTE.length]
}

export default function FilaPage() {
  const user = useCurrentUser()
  const [soMeus, setSoMeus] = useState(false)
  const [data, setData] = useState<FilaResponse | null>(null)
  const [loading, setLoading] = useState(true)

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

      {loading && <p className="text-sm text-slate-400">Carregando…</p>}

      {data && (
        <div className="space-y-5">
          {isGerencia && data.secoes.aprovacaoDivergencia.length > 0 && (
            <SecaoDivergencia
              itens={data.secoes.aprovacaoDivergencia}
              onAprovar={aprovarDivergencia}
            />
          )}

          {(data.etapas ?? []).map((etapa) => (
            <SecaoOS
              key={etapa}
              etapa={etapa}
              itens={data.secoes[etapa] ?? []}
              count={data.counts[etapa] ?? 0}
              onAvancar={avancarOS}
            />
          ))}
        </div>
      )}
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
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{p.numero}</p>
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

function SecaoOS({ etapa, itens, count, onAvancar }: { etapa: string; itens: FilaOS[]; count: number; onAvancar: (id: number) => void }) {
  const meta = ETAPA_META[etapa] ?? { label: etapa, icon: ClipboardList, color: 'text-slate-500' }
  const Icon = meta.icon
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
        <Icon className={`h-4 w-4 ${meta.color}`} />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{meta.label}</h2>
        <Badge variant="slate" className="ml-auto">{count}</Badge>
      </div>
      {itens.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12px] text-slate-400">Nada nessa etapa.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {itens.map((o) => (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-3 border-l-4"
              style={{ borderLeftColor: corCliente(o.amostra.pedido.cliente.nomeFantasia || o.amostra.pedido.cliente.nome) }}>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                  {o.numero} · Amostra {o.amostra.numeroInterno}
                  {o.amostra.numeroCliente ? ` (${o.amostra.numeroCliente})` : ''}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {o.amostra.pedido.numero} · {o.amostra.pedido.cliente.nomeFantasia || o.amostra.pedido.cliente.nome} · {o.amostra.especie} · {o.amostra.material}
                  {o.responsavel ? ` · ${o.responsavel}` : ''}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onAvancar(o.id)}>
                Avançar <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
