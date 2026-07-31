'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

type Row = {
  numero: string
  cliente: string
  clienteCodigo?: string
  urgente: boolean
  criado: string | null
  recepcao: string | null
  laboratorio: string | null
  processado: string | null
  despachado: string | null
  durRecepcao: number | null
  durLaboratorio: number | null
  durProcessamento: number | null
  durDespacho: number | null
  durTotal: number | null
}

type Resumo = {
  totalPedidos: number
  mediaRecepcao: number | null
  mediaLaboratorio: number | null
  mediaProcessamento: number | null
  mediaDespacho: number | null
  mediaTotal: number | null
}

function fmtDur(min: number | null) {
  if (min == null) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h < 24) return m ? `${h}h ${m}min` : `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh ? `${d}d ${rh}h` : `${d}d`
}

function fmtData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function hojeISO(offsetDias = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

export default function RelatoriosPage() {
  const [inicio, setInicio] = useState(hojeISO(-30))
  const [fim, setFim] = useState(hojeISO(0))
  const [rows, setRows] = useState<Row[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')

  const rowsFiltradas = rows.filter((r) => {
    const q = filtroCliente.trim().toLowerCase()
    if (!q) return true
    return r.cliente.toLowerCase().includes(q) || (r.clienteCodigo ?? '').toLowerCase().includes(q)
  })

  const carregar = useCallback(() => {
    setLoading(true)
    api.get<{ rows: Row[]; resumo: Resumo }>(`/relatorios/tempos?inicio=${inicio}&fim=${fim}`)
      .then((r) => { setRows(r.rows); setResumo(r.resumo) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [inicio, fim])

  useEffect(() => { carregar() }, [carregar])

  const cards = [
    { label: 'Criado → Recepção', valor: resumo?.mediaRecepcao },
    { label: 'Recepção → Laboratório', valor: resumo?.mediaLaboratorio },
    { label: 'Laboratório → Processado', valor: resumo?.mediaProcessamento },
    { label: 'Processado → Despachado', valor: resumo?.mediaDespacho },
    { label: 'Total (criado → despacho)', valor: resumo?.mediaTotal, destaque: true },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatório de Tempos"
        subtitle="Quanto tempo cada pedido leva em cada etapa do processo"
        action={
          <Button variant="secondary" onClick={carregar} loading={loading}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
          </Button>
        }
      />

      {/* Filtro de período */}
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-slate-600 dark:text-slate-300">De</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Até</label>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <Button onClick={carregar} loading={loading}>Aplicar</Button>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Cliente</label>
          <input
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            placeholder="Filtrar por cliente/código…"
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-[12px] text-slate-400 ml-auto self-center">
          {filtroCliente ? `${rowsFiltradas.length} de ` : ''}{resumo?.totalPedidos ?? 0} pedido(s) no período
        </span>
      </div>

      {/* Médias por etapa */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label}
            className={`rounded-card border p-4 ${c.destaque
              ? 'border-blue-200 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{c.label}</p>
            <p className={`mt-1 text-xl font-bold ${c.destaque ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
              {fmtDur(c.valor ?? null)}
            </p>
            <p className="text-[10px] text-slate-400">média</p>
          </div>
        ))}
      </div>

      {/* Tabela por pedido */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
        {rowsFiltradas.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-slate-400">
            {loading
              ? 'Carregando…'
              : filtroCliente
                ? `Nenhum pedido para “${filtroCliente}” neste período.`
                : 'Nenhum pedido que entrou no fluxo neste período.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Pedido</th>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Criado</th>
                  <th className="px-3 py-2 font-semibold text-right">→ Recepção</th>
                  <th className="px-3 py-2 font-semibold text-right">→ Laboratório</th>
                  <th className="px-3 py-2 font-semibold text-right">→ Processado</th>
                  <th className="px-3 py-2 font-semibold text-right">→ Despachado</th>
                  <th className="px-3 py-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rowsFiltradas.map((r) => (
                  <tr key={r.numero}>
                    <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {r.numero}
                        {r.urgente && <Badge variant="rose">Urg</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                      {r.clienteCodigo && (
                        <span className="font-mono text-[11px] text-slate-400 mr-1.5">{r.clienteCodigo}</span>
                      )}
                      {r.cliente}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtData(r.criado)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtDur(r.durRecepcao)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtDur(r.durLaboratorio)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtDur(r.durProcessamento)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtDur(r.durDespacho)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-100">{fmtDur(r.durTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Carimbos: <strong>Criado</strong> e <strong>Recepção/Laboratório</strong> do pedido; <strong>Processado/Despachado</strong> dos scans de rastreio.
      </p>
    </div>
  )
}
