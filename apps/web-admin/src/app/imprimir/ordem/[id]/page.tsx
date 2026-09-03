'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Barcode } from '@/components/ui/Barcode'
import type { OrdemServico } from '@/app/(dashboard)/os/types'
import { clienteDaOS } from '@/app/(dashboard)/os/types'
import type { Etiqueta, EtiquetaListResponse } from '@/app/(dashboard)/etiquetas/types'
import { ETAPA_LABEL } from '@/lib/etapas'

function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
function fmtData(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

const CONDICAO_LABEL: Record<string, string> = {
  molhado: 'Molhado',
  seco: 'Seco',
  macroscopia: 'Macroscopia',
}

/**
 * Documento da OS aberta na Entrada (pedido do Célio, 02/09): traz cliente,
 * data, volumes recebidos e a lista de cassetes com a identificação do cliente
 * e o serviço de cada um — mais o código de barras da OS, que é o mesmo carimbo
 * bipado na conferência de saída. Diferente de /imprimir/os/[id], que imprime o
 * Pedido: esta imprime a própria Ordem de Serviço.
 */
export default function ImprimirOrdemPage() {
  const { id } = useParams<{ id: string }>()
  const [os, setOs] = useState<OrdemServico | null>(null)
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<OrdemServico>(`/ordens/${id}`),
      api
        .get<EtiquetaListResponse>(`/etiquetas?ordemServicoId=${id}&limit=500`)
        .then((r) => r.data)
        .catch(() => [] as Etiqueta[]),
    ])
      .then(([ordem, etqs]) => {
        setOs(ordem)
        setEtiquetas(etqs)
      })
      .catch((e) => setErro(e.message ?? 'Erro ao carregar'))
  }, [id])

  if (erro) return <div className="p-8 text-sm text-rose-600">{erro}</div>
  if (!os) return <div className="p-8 text-sm text-slate-500">Carregando…</div>

  const clienteLabel = clienteDaOS(os)
  const codigoCurto = os.seq != null ? `#${String(os.seq).padStart(4, '0')}` : os.numero
  // Cassetes agrupados por item de serviço, na ordem em que foram gerados.
  const etqsPorItem = new Map<number | 'sem', Etiqueta[]>()
  for (const e of etiquetas) {
    const k = e.itemOrdemServico?.id ?? 'sem'
    if (!etqsPorItem.has(k)) etqsPorItem.set(k, [])
    etqsPorItem.get(k)!.push(e)
  }
  const totalCassetes = etiquetas.length

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
            <div>Data: {fmtData(os.createdAt)}</div>
            <div>Etapa: {ETAPA_LABEL[os.etapaAtual] ?? os.etapaAtual}</div>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between">
          <div>
            <div className="text-[14px] font-bold">Cliente: {clienteLabel}</div>
            <div className="text-[11px] text-slate-600">
              Ordem de Serviço Nº <strong>{codigoCurto}</strong>
              <span className="text-slate-400"> · ref. {os.numero}</span>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <div>Entrada: {fmt(os.createdAt)}</div>
          </div>
        </div>

        {os.observacoes && (
          <div className="mt-2 text-[11px]">
            <span className="text-slate-500">Observações:</span> {os.observacoes}
          </div>
        )}

        {/* Volumes recebidos na Entrada */}
        {os.volumes.length > 0 && (
          <div className="mt-4">
            <div className="text-[12px] font-semibold">Material recebido ({os.volumes.length})</div>
            <table className="mt-1 w-full border-collapse">
              <thead>
                <tr className="border-y border-black text-left">
                  <th className="py-1 pr-2 font-semibold">#</th>
                  <th className="py-1 pr-2 font-semibold">Volume</th>
                  <th className="py-1 pr-2 font-semibold">Condição</th>
                  <th className="py-1 pr-2 font-semibold">Código</th>
                  <th className="py-1 pl-2 font-semibold">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {os.volumes.map((v, i) => (
                  <tr key={v.id} className="border-b border-slate-200">
                    <td className="py-1 pr-2 font-mono">{i + 1}</td>
                    <td className="py-1 pr-2">{v.tipo}</td>
                    <td className="py-1 pr-2">{v.condicao ? CONDICAO_LABEL[v.condicao] ?? v.condicao : '—'}</td>
                    <td className="py-1 pr-2 font-mono">{v.codigo ?? '—'}</td>
                    <td className="py-1 pl-2">{v.observacoes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Serviços a executar, com os cassetes identificados sob cada item */}
        <div className="mt-4">
          <div className="text-[12px] font-semibold">Serviços a executar</div>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr className="border-y border-black text-left">
                <th className="py-1 pr-2 font-semibold">C.S.</th>
                <th className="py-1 pr-2 font-semibold">Serviço</th>
                <th className="py-1 pr-2 font-semibold">Identificação (cassetes)</th>
                <th className="py-1 pl-2 font-semibold text-right">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {os.itens.map((it) => {
                const cassetes = etqsPorItem.get(it.id) ?? []
                return (
                  <tr key={it.id} className="border-b border-slate-200 align-top">
                    <td className="py-1 pr-2 font-mono">{it.servico.codigo}</td>
                    <td className="py-1 pr-2">{it.servico.nome}</td>
                    <td className="py-1 pr-2">
                      {cassetes.length > 0
                        ? cassetes.map((c) => c.identificacao).join(', ')
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-1 pl-2 text-right">{it.quantidade}</td>
                  </tr>
                )
              })}
              {os.itens.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-center text-slate-400">
                    Nenhum serviço definido ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-2 text-[12px] font-semibold">
            Serviços: {os.itens.reduce((s, i) => s + i.quantidade, 0)} · Cassetes etiquetados: {totalCassetes}
          </div>
        </div>

        {/* Carimbo de saída: o técnico bipa este código na conferência */}
        <div className="mt-6 flex items-end justify-between border-t border-black pt-3">
          <div className="text-[11px] text-slate-600">
            <div className="font-semibold">Conferência de saída</div>
            <div>Bipe o código da OS ao entregar o material.</div>
          </div>
          <div className="text-center">
            <Barcode value={os.numero} height={34} width={1.2} />
            <div className="font-mono text-[9px] leading-none">{os.numero}</div>
          </div>
        </div>

        {/* Assinaturas (modelo antigo) */}
        <div className="mt-12 space-y-10 text-[11px]">
          <div>
            <div className="flex items-end gap-4">
              <div className="flex-1 border-b border-black">Encaminhado por:</div>
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
