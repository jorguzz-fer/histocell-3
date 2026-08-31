'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Barcode } from '@/components/ui/Barcode'

type ServicoRef = { nome: string; codigo: string }
type Detalhe = {
  numero: string
  seq?: number | null
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
    servico?: ServicoRef | null
    itemPedido?: { servico: ServicoRef } | null
    /** OS da amostra — o código de barras dela é o carimbo da conferência de saída. */
    ordemServico?: { numero: string; seq?: number | null } | null
  }[]
}

function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
function fmtData(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function ImprimirOSPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Detalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Detalhe>(`/recebimento/pedido/${id}/detalhe`)
      .then(setData)
      .catch((e) => setErro(e.message ?? 'Erro ao carregar'))
  }, [id])

  if (erro) return <div className="p-8 text-sm text-rose-600">{erro}</div>
  if (!data) return <div className="p-8 text-sm text-slate-500">Carregando…</div>

  const clienteLabel = data.cliente.nomeFantasia ?? data.cliente.nome
  const codigoCurto = data.seq != null ? `#${String(data.seq).padStart(4, '0')}` : data.numero
  const recById = new Map(data.recipientes.map((r) => [r.id, r]))

  // Serviço de cada amostra: usa o item de origem; se o pedido tiver um único
  // serviço, aplica-o a todas as amostras (caso comum de um serviço só).
  const servicoUnico = data.itens.length === 1 ? data.itens[0].servico : null
  const servicoDaAmostra = (a: Detalhe['amostras'][number]): ServicoRef | null =>
    a.servico ?? a.itemPedido?.servico ?? servicoUnico

  // Serviços que NÃO estão amarrados a nenhuma amostra (ex.: caixa porta-lâmina)
  // entram como linhas próprias, com a quantidade.
  const itensComAmostra = new Set(
    data.amostras.map((a) => a.itemPedidoId).filter((x): x is number => x != null),
  )
  const servicosAvulsos = data.itens.filter((i) => !itensComAmostra.has(i.id))

  const qtdeServicos = data.amostras.length + servicosAvulsos.reduce((s, i) => s + i.quantidade, 0)

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
        <div className="text-[13px] text-slate-600">
          Ordem de Serviço · <strong>{codigoCurto}</strong> · {clienteLabel}
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
        >
          Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-3xl p-8 text-[12px] leading-relaxed">
        {/* Cabeçalho (modelo Histocell) */}
        <div className="flex items-start justify-between border-b-2 border-black pb-2">
          <div>
            <div className="text-[15px] font-bold">Histocell Soluções em Anatomia Patológica</div>
            <div className="text-[11px] text-slate-700">Rua Teodoro Sampaio, 417 Cj. 112 — Pinheiros — São Paulo</div>
            <div className="text-[11px] text-slate-700">Tel: (11) 3060-9190 · www.histocell.com.br</div>
          </div>
          <div className="text-right text-[11px]">
            <div>Data: {fmtData(data.createdAt)}</div>
            <div>Folha: 001</div>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between">
          <div>
            <div className="text-[14px] font-bold">Cliente: {clienteLabel}</div>
            <div className="text-[11px] text-slate-600">
              Ordem de Serviço Nº <strong>{codigoCurto}</strong>
              <span className="text-slate-400"> · ref. {data.numero}</span>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <div>Recepção: {fmt(data.dataRecepcao)}</div>
            <div>Identificação (lab): {fmt(data.dataRecebimento)}</div>
          </div>
        </div>

        {data.observacoes && (
          <div className="mt-2 text-[11px]">
            <span className="text-slate-500">Observações:</span> {data.observacoes}
          </div>
        )}

        {/* Tabela principal — serviço em cada item (modelo antigo) */}
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-y border-black text-left">
              <th className="py-1 pr-2 font-semibold">C.S.</th>
              <th className="py-1 pr-2 font-semibold">Serviço</th>
              <th className="py-1 pr-2 font-semibold">Nº Histo</th>
              <th className="py-1 pr-2 font-semibold">Identificação</th>
              <th className="py-1 pr-2 font-semibold">Obs.</th>
              <th className="py-1 pr-2 font-semibold text-right">Qtd</th>
              <th className="py-1 pl-2 font-semibold text-right">Saída (bipar)</th>
            </tr>
          </thead>
          <tbody>
            {data.amostras.map((a) => {
              const s = servicoDaAmostra(a)
              return (
                <tr key={`am-${a.id}`} className="border-b border-slate-200">
                  <td className="py-1 pr-2 font-mono">{s?.codigo ?? '—'}</td>
                  <td className="py-1 pr-2">{s?.nome ?? '—'}</td>
                  <td className="py-1 pr-2 font-mono font-semibold">{a.numeroInterno}</td>
                  <td className="py-1 pr-2">{a.numeroCliente ?? '—'}</td>
                  <td className="py-1 pr-2">{a.observacoes ?? ''}</td>
                  <td className="py-1 pr-2 text-right">1</td>
                  {/* Código da OS: bipado na conferência como carimbo de saída —
                      cobre também o serviço que não gera etiqueta de lâmina. */}
                  <td className="py-1 pl-2 text-right">
                    {a.ordemServico ? (
                      <div className="inline-block text-center">
                        <Barcode value={a.ordemServico.numero} height={26} width={1} />
                        <div className="font-mono text-[8px] leading-none">{a.ordemServico.numero}</div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
            {servicosAvulsos.map((i) => (
              <tr key={`sv-${i.id}`} className="border-b border-slate-200">
                <td className="py-1 pr-2 font-mono">{i.servico.codigo}</td>
                <td className="py-1 pr-2">{i.servico.nome}</td>
                <td className="py-1 pr-2 text-slate-400">—</td>
                <td className="py-1 pr-2 text-slate-400">—</td>
                <td className="py-1 pr-2" />
                <td className="py-1 pr-2 text-right">{i.quantidade}</td>
                <td className="py-1 pl-2" />
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 text-[12px] font-semibold">Qtde de serviços: {qtdeServicos}</div>

        {/* Recipientes */}
        {data.recipientes.length > 0 && (
          <div className="mt-3 text-[11px] text-slate-600">
            <span className="font-semibold">Recipientes recebidos ({data.recipientes.length}):</span>{' '}
            {data.recipientes.map((r, i) => `${i + 1}. ${r.tipo}`).join('  ')}
          </div>
        )}

        {/* Assinaturas (modelo antigo) */}
        <div className="mt-14 space-y-10 text-[11px]">
          <div>
            <div className="flex items-end gap-4">
              <div className="flex-1 border-b border-black">Recebido por:</div>
              <div className="w-56 border-b border-black">em: ____ / ____ / ______</div>
            </div>
            <div className="mt-4 border-b border-black">Nome completo:</div>
          </div>
          <div>
            <div className="flex items-end gap-4">
              <div className="flex-1 border-b border-black">Recebido por:</div>
              <div className="w-56 border-b border-black">em: ____ / ____ / ______</div>
            </div>
            <div className="mt-4 border-b border-black">Nome completo:</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  )
}
