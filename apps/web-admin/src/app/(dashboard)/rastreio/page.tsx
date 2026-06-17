'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, RefreshCw, Route, Search } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { ScanBox } from './ScanBox'
import {
  STATUS_LABEL,
  type Departamento,
  type ResumoResponse,
  type TimelineResponse,
} from './types'

function fmtData(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDuracao(min: number | null) {
  if (min == null) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

export default function RastreioPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [resumo, setResumo] = useState<ResumoResponse | null>(null)
  const [busca, setBusca] = useState('')
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null)
  const [loadingTl, setLoadingTl] = useState(false)

  useEffect(() => {
    api.get<Departamento[]>('/rastreio/departamentos').then(setDepartamentos).catch(() => {})
  }, [])

  const fetchResumo = useCallback(() => {
    api.get<ResumoResponse>('/rastreio/resumo').then(setResumo).catch(() => {})
  }, [])

  useEffect(() => {
    fetchResumo()
    const id = setInterval(fetchResumo, 10000)
    return () => clearInterval(id)
  }, [fetchResumo])

  const consultar = useCallback(async (codigo: string) => {
    const code = codigo.trim()
    if (!code) return
    setLoadingTl(true)
    try {
      const res = await api.get<TimelineResponse>(`/rastreio/timeline?codigo=${encodeURIComponent(code)}`)
      setTimeline(res)
    } catch (err: any) {
      toast.error(err.message ?? 'Código não encontrado')
      setTimeline(null)
    } finally {
      setLoadingTl(false)
    }
  }, [])

  const labelDep = (key?: string | null) =>
    departamentos.find((d) => d.key === key)?.label ?? key ?? '—'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rastreio de Pedidos"
        subtitle="Acompanhe cada lâmina/cassete pelos departamentos via código de barras"
        action={
          <Button variant="secondary" onClick={fetchResumo}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
          </Button>
        }
      />

      {/* Resumo por departamento (cada card abre o painel do setor) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {(resumo?.departamentos ?? []).map((d) => (
          <Link
            key={d.key}
            href={`/rastreio/departamento/${d.key}`}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4
              hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {d.ordem}. {d.label}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{d.emProcesso}</span>
              <span className="text-[12px] text-slate-400">na fila</span>
            </div>
          </Link>
        ))}
      </div>

      {resumo && (
        <div className="flex flex-wrap gap-4 text-[12px] text-slate-500 dark:text-slate-400">
          <span>Total de etiquetas: <strong className="text-slate-700 dark:text-slate-200">{resumo.total}</strong></span>
          <span>Concluídas: <strong className="text-emerald-600">{resumo.concluidas}</strong></span>
          <span>Não iniciadas: <strong className="text-slate-700 dark:text-slate-200">{resumo.naoIniciadas}</strong></span>
        </div>
      )}

      {/* Estação de scan (departamento selecionável) */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Registrar movimentação</h2>
        <ScanBox
          departamentos={departamentos}
          onScanned={(res) => {
            fetchResumo()
            consultar(res.etiqueta.codigo)
          }}
        />
      </div>

      {/* Consulta da jornada de uma etiqueta */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Consultar jornada</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            consultar(busca)
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Código de barras da etiqueta…"
              autoComplete="off"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-2 text-[13px]
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
          <Button type="submit" variant="secondary" loading={loadingTl}>Consultar</Button>
        </form>

        {timeline && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {timeline.etiqueta.codigo}
              </span>
              <span className="text-slate-500">{timeline.etiqueta.identificacao ?? '—'}</span>
              <span className="text-slate-400">Histocell {timeline.etiqueta.amostra.numeroInterno}</span>
              <span className="text-slate-400">
                {timeline.etiqueta.amostra.pedido.cliente.nomeFantasia ??
                  timeline.etiqueta.amostra.pedido.cliente.nome}
              </span>
              <Badge variant={STATUS_LABEL[timeline.etiqueta.rastreioStatus]?.variant ?? 'slate'}>
                {STATUS_LABEL[timeline.etiqueta.rastreioStatus]?.label ?? timeline.etiqueta.rastreioStatus}
                {timeline.etiqueta.departamentoAtual ? ` · ${labelDep(timeline.etiqueta.departamentoAtual)}` : ''}
              </Badge>
            </div>

            {timeline.segmentos.length === 0 ? (
              <p className="text-[12px] text-slate-400">Ainda sem movimentações registradas.</p>
            ) : (
              <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-2 space-y-4">
                {timeline.segmentos.map((s, i) => (
                  <li key={i} className="ml-4">
                    <span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                      {labelDep(s.departamento)}
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">
                      Entrada: {fmtData(s.entrada)} · Saída: {fmtData(s.saida)} · Duração: {fmtDuracao(s.duracaoMin)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
