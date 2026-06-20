'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'

type Detalhe = {
  numero: string
  createdAt: string
  dataRecepcao?: string | null
  dataRecebimento?: string | null
  observacoes?: string | null
  cliente: { nome: string; nomeFantasia?: string | null }
  itens: { quantidade: number; servico: { nome: string; codigo: string } }[]
  recipientes: { id: number; tipo: string; codigo: string | null }[]
  amostras: {
    id: number
    numeroInterno: string
    numeroCliente?: string | null
    recipienteId?: number | null
  }[]
}

function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
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
  const recById = new Map(data.recipientes.map((r) => [r.id, r]))

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
        <div className="text-[13px] text-slate-600">
          Ordem de Serviço · <strong>{data.numero}</strong> · {clienteLabel}
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
        >
          Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-3xl p-8 text-[12px] leading-relaxed">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b-2 border-black pb-3">
          <div>
            <div className="text-lg font-bold">HISTOCELL</div>
            <div className="text-[11px] text-slate-600">Soluções em Anatomia Patológica</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold">ORDEM DE SERVIÇO</div>
            <div className="font-mono">{data.numero}</div>
          </div>
        </div>

        {/* Dados gerais */}
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
          <div><span className="text-slate-500">Cliente:</span> <strong>{clienteLabel}</strong></div>
          <div><span className="text-slate-500">Pedido:</span> {data.numero}</div>
          <div><span className="text-slate-500">Recepção:</span> {fmt(data.dataRecepcao)}</div>
          <div><span className="text-slate-500">Identificação (lab):</span> {fmt(data.dataRecebimento)}</div>
        </div>

        {/* Recipientes */}
        <h2 className="mt-5 border-b border-black pb-1 text-[11px] font-bold uppercase tracking-wider">
          Recipientes recebidos ({data.recipientes.length})
        </h2>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
          {data.recipientes.map((r, i) => (
            <span key={r.id}>
              {i + 1}. {r.tipo} <span className="font-mono text-slate-500">{r.codigo}</span>
            </span>
          ))}
        </div>

        {/* Amostras */}
        <h2 className="mt-5 border-b border-black pb-1 text-[11px] font-bold uppercase tracking-wider">
          Amostras designadas ({data.amostras.length})
        </h2>
        <table className="mt-1 w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1 pr-2 font-semibold">Nº Histocell</th>
              <th className="py-1 pr-2 font-semibold">Nº Cliente</th>
              <th className="py-1 pr-2 font-semibold">Recipiente</th>
              <th className="py-1 pr-2 font-semibold">Resultado / Obs.</th>
            </tr>
          </thead>
          <tbody>
            {data.amostras.map((a) => (
              <tr key={a.id} className="border-b border-slate-200">
                <td className="py-1 pr-2 font-mono font-semibold">{a.numeroInterno}</td>
                <td className="py-1 pr-2">{a.numeroCliente ?? '—'}</td>
                <td className="py-1 pr-2">
                  {a.recipienteId != null ? recById.get(a.recipienteId)?.tipo ?? '—' : '—'}
                </td>
                <td className="py-1 pr-2" />
              </tr>
            ))}
          </tbody>
        </table>

        {/* Serviços (sem valores) */}
        <h2 className="mt-5 border-b border-black pb-1 text-[11px] font-bold uppercase tracking-wider">
          Serviços solicitados
        </h2>
        <ul className="mt-1 space-y-0.5">
          {data.itens.map((it, i) => (
            <li key={i} className="flex justify-between">
              <span>
                <span className="font-mono text-slate-500">{it.servico.codigo}</span> {it.servico.nome}
              </span>
              <span className="text-slate-500">× {it.quantidade}</span>
            </li>
          ))}
        </ul>

        {data.observacoes && (
          <>
            <h2 className="mt-5 border-b border-black pb-1 text-[11px] font-bold uppercase tracking-wider">
              Observações
            </h2>
            <p className="mt-1 whitespace-pre-line">{data.observacoes}</p>
          </>
        )}

        {/* Assinaturas */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <div className="border-t border-black pt-1 text-center text-[11px]">Responsável (lab)</div>
          <div className="border-t border-black pt-1 text-center text-[11px]">Conferência</div>
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
