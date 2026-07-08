'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Barcode } from '@/components/ui/Barcode'
import { api } from '@/lib/api'

type Detalhe = {
  numero: string
  dataRecebimento?: string | null
  cliente: { nome: string; nomeFantasia?: string | null; idEtiqueta?: string | null }
  recipientes: { id: number; tipo: string; codigo: string | null }[]
  amostras: { recipienteId: number | null }[]
}

// Etiqueta do volume recebido na recepção — 10 cm × 3 cm.
const LARGURA_MM = 100
const ALTURA_MM = 30

function ddmmaaaa(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const aaaa = String(d.getFullYear())
  return `${dd}/${mm}/${aaaa}`
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
  const dataFmt = ddmmaaaa(data.dataRecebimento)
  const recipientes = data.recipientes.filter((r) => r.codigo)
  const total = recipientes.length
  const contarAmostras = (recipienteId: number) =>
    data.amostras.filter((a) => a.recipienteId === recipienteId).length

  return (
    <div className="min-h-screen bg-white text-black">
      {/* barra de ação — some na impressão */}
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
        <div className="text-[13px] text-slate-600">
          Etiquetas dos recipientes · <strong>{data.numero}</strong> · {clienteLabel} ·{' '}
          {total} recipiente(s) · 10×3 cm
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
        >
          Imprimir
        </button>
      </div>

      {/* Prévia em tela + área de impressão (1 etiqueta por página) */}
      <div className="etq-vol-area flex flex-col items-center gap-3 p-6">
        {recipientes.map((r, i) => {
          const nAmostras = contarAmostras(r.id)
          return (
            <div className="etq-vol-page" key={r.id}>
              <div className="etq-vol">
                <div className="etq-vol-cliente">{clienteLabel}</div>
                <div className="etq-vol-info">
                  <span>
                    {data.numero} · {dataFmt}
                  </span>
                  <span>
                    {r.tipo} {String(i + 1).padStart(2, '0')} de {String(total).padStart(2, '0')}
                    {nAmostras > 0 ? ` · ${nAmostras} amostra${nAmostras > 1 ? 's' : ''}` : ''}
                  </span>
                </div>
                <Barcode value={r.codigo!} height={46} width={1.2} displayValue className="etq-vol-barcode" />
              </div>
            </div>
          )
        })}
      </div>

      <style jsx global>{`
        .etq-vol {
          box-sizing: border-box;
          width: ${LARGURA_MM}mm;
          height: ${ALTURA_MM}mm;
          padding: 1.5mm 3mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.6mm;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          overflow: hidden;
        }
        .etq-vol-cliente {
          font-size: 4.2mm;
          font-weight: 700;
          line-height: 1.05;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .etq-vol-info {
          display: flex;
          justify-content: space-between;
          gap: 4mm;
          font-size: 2.6mm;
          line-height: 1.1;
        }
        .etq-vol-barcode {
          width: 100%;
          height: auto;
          margin-top: 0.4mm;
        }
        /* Prévia em tela: mostra a borda do tamanho real da etiqueta */
        .etq-vol-page {
          border: 1px dashed #cbd5e1;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .etq-vol-area {
            padding: 0 !important;
            gap: 0 !important;
          }
          .etq-vol-page {
            border: none !important;
            width: ${LARGURA_MM}mm;
            height: ${ALTURA_MM}mm;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
          }
          .etq-vol-page:last-child {
            page-break-after: auto;
          }
          @page {
            size: ${LARGURA_MM}mm ${ALTURA_MM}mm;
            margin: 0;
          }
        }
      `}</style>
    </div>
  )
}
