'use client'

import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'

type ServicoRef = { nome: string; codigo: string }
type Detalhe = {
  numero: string
  createdAt: string
  dataRecepcao?: string | null
  dataRecebimento?: string | null
  observacoes?: string | null
  cliente: { nome: string; nomeFantasia?: string | null }
  itens: { id: number; quantidade: number; servico: ServicoRef }[]
  recipientes: { id: number; tipo: string; codigo: string | null }[]
  amostras: {
    id: number
    numeroInterno: string
    numeroCliente?: string | null
    recipienteId?: number | null
    observacoes?: string | null
    itemPedidoId?: number | null
    itemPedido?: { servico: ServicoRef } | null
  }[]
}

function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Modal com o resumo da OS/pedido (cliente, recipientes, amostras e serviços
 * solicitados — sem valores). Reaproveita o endpoint do detalhe do pedido, o
 * mesmo que alimenta a página de impressão.
 */
export function OSModal({
  pedidoId,
  osNumero,
  open,
  onClose,
}: {
  pedidoId: number | null
  osNumero?: string
  open: boolean
  onClose: () => void
}) {
  const [data, setData] = useState<Detalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || pedidoId == null) return
    setData(null)
    setErro(null)
    setLoading(true)
    api
      .get<Detalhe>(`/recebimento/pedido/${pedidoId}/detalhe`)
      .then(setData)
      .catch((e) => setErro(e.message ?? 'Erro ao carregar a OS'))
      .finally(() => setLoading(false))
  }, [open, pedidoId])

  const clienteLabel = data ? (data.cliente.nomeFantasia ?? data.cliente.nome) : ''
  const recById = new Map((data?.recipientes ?? []).map((r) => [r.id, r]))
  // Se o pedido tem um único serviço, aplica-o a todas as amostras (caso comum).
  const servicoUnico = data && data.itens.length === 1 ? data.itens[0].servico : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Ordem de Serviço ${osNumero ?? data?.numero ?? ''}`.trim()}
      subtitle={data ? clienteLabel : undefined}
      footer={
        pedidoId != null ? (
          <button
            onClick={() => window.open(`/imprimir/os/${pedidoId}`, '_blank')}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
          >
            <Printer className="h-3.5 w-3.5" /> Abrir impressão
          </button>
        ) : null
      }
    >
      {loading && <p className="text-[13px] text-slate-500">Carregando…</p>}
      {erro && <p className="text-[13px] text-rose-600">{erro}</p>}

      {data && (
        <div className="space-y-5 text-[13px] text-slate-700 dark:text-slate-200">
          {/* Dados gerais */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div><span className="text-slate-400">Cliente:</span> <strong>{clienteLabel}</strong></div>
            <div><span className="text-slate-400">Pedido:</span> {data.numero}</div>
            <div><span className="text-slate-400">Recepção:</span> {fmt(data.dataRecepcao)}</div>
            <div><span className="text-slate-400">Identificação (lab):</span> {fmt(data.dataRecebimento)}</div>
          </div>

          {/* Recipientes */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Recipientes recebidos ({data.recipientes.length})
            </h3>
            {data.recipientes.length === 0 ? (
              <p className="text-slate-400">—</p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {data.recipientes.map((r, i) => (
                  <span key={r.id}>{i + 1}. {r.tipo} <span className="font-mono text-slate-400">{r.codigo}</span></span>
                ))}
              </div>
            )}
          </div>

          {/* Amostras — com o serviço de cada item (modelo da OS antiga) */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Amostras / itens ({data.amostras.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-1 pr-2 font-medium">Cód.</th>
                    <th className="py-1 pr-2 font-medium">Serviço</th>
                    <th className="py-1 pr-2 font-medium">Nº Histo</th>
                    <th className="py-1 pr-2 font-medium">Identificação</th>
                    <th className="py-1 pr-2 font-medium">Recipiente</th>
                  </tr>
                </thead>
                <tbody>
                  {data.amostras.map((a) => {
                    const s = a.itemPedido?.servico ?? servicoUnico
                    return (
                      <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-1 pr-2 font-mono text-slate-400">{s?.codigo ?? '—'}</td>
                        <td className="py-1 pr-2">{s?.nome ?? '—'}</td>
                        <td className="py-1 pr-2 font-mono font-semibold">{a.numeroInterno}</td>
                        <td className="py-1 pr-2">{a.numeroCliente ?? '—'}</td>
                        <td className="py-1 pr-2">{a.recipienteId != null ? recById.get(a.recipienteId)?.tipo ?? '—' : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Serviços solicitados (com código e descrição) */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Serviços solicitados ({data.itens.length})
            </h3>
            <ul className="space-y-0.5">
              {data.itens.map((it) => (
                <li key={it.id} className="flex justify-between gap-3">
                  <span><span className="font-mono text-slate-400">{it.servico.codigo}</span> {it.servico.nome}</span>
                  <span className="text-slate-400 tabular-nums">× {it.quantidade}</span>
                </li>
              ))}
            </ul>
          </div>

          {data.observacoes && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Observações</h3>
              <p className="whitespace-pre-line">{data.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
