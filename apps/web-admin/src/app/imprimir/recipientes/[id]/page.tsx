'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FolhaEtiquetasVolume } from '@/components/FolhaEtiquetasVolume'
import { api } from '@/lib/api'

type Detalhe = {
  numero: string
  dataRecebimento?: string | null
  cliente: { nome: string; nomeFantasia?: string | null; idEtiqueta?: string | null }
  recipientes: { id: number; tipo: string; codigo: string | null }[]
  amostras: { recipienteId: number | null }[]
}

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

      <FolhaEtiquetasVolume
        clienteLabel={clienteLabel}
        esquerda={`${data.numero} · ${ddmmaaaa(data.dataRecebimento)}`}
        volumes={recipientes.map((r, i) => {
          const nAmostras = contarAmostras(r.id)
          return {
            id: r.id,
            codigo: r.codigo!,
            direita:
              `${r.tipo} ${String(i + 1).padStart(2, '0')} de ${String(total).padStart(2, '0')}` +
              (nAmostras > 0 ? ` · ${nAmostras} amostra${nAmostras > 1 ? 's' : ''}` : ''),
          }
        })}
      />
    </div>
  )
}
