'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Barcode } from '@/components/ui/Barcode'
import { api } from '@/lib/api'

type Detalhe = {
  numero: string
  cliente: { nome: string; nomeFantasia?: string | null; idEtiqueta?: string | null }
  recipientes: { id: number; tipo: string; codigo: string | null }[]
}

export default function ImprimirRecipientesPage() {
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

  const clienteLabel = data.cliente.idEtiqueta || data.cliente.nomeFantasia || data.cliente.nome
  const recipientes = data.recipientes.filter((r) => r.codigo)

  return (
    <div className="min-h-screen bg-white text-black">
      {/* barra de ação — some na impressão */}
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
        <div className="text-[13px] text-slate-600">
          Etiquetas dos recipientes · <strong>{data.numero}</strong> · {clienteLabel} ·{' '}
          {recipientes.length} recipiente(s)
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
        >
          Imprimir
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3">
        {recipientes.map((r, i) => (
          <div
            key={r.id}
            className="flex flex-col items-center justify-center gap-1 rounded-md border border-black p-3 text-center"
          >
            <div className="w-full text-left text-[11px] font-semibold leading-tight">{clienteLabel}</div>
            <div className="w-full text-left text-[11px] leading-tight">
              {data.numero} · {r.tipo} {String(i + 1).padStart(2, '0')}
            </div>
            <Barcode value={r.codigo!} height={42} width={1.5} displayValue className="mt-1" />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  )
}
