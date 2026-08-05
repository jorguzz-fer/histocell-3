'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FolhaEtiquetasVolume } from '@/components/FolhaEtiquetasVolume'
import { api } from '@/lib/api'

type Etiquetas = {
  cliente: { id: number; nome: string; nomeFantasia?: string | null; idEtiqueta?: string | null } | null
  recebidoEm: string
  volumes: { id: number; tipo: string; codigo: string | null; observacoes: string | null }[]
}

function ddmmaaaa(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function ImprimirEntrada() {
  const params = useSearchParams()
  const ids = params.get('ids') ?? ''
  const [data, setData] = useState<Etiquetas | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!ids) {
      setErro('Nenhum volume informado.')
      return
    }
    api
      .get<Etiquetas>(`/recebimento/entradas/etiquetas?ids=${encodeURIComponent(ids)}`)
      .then(setData)
      .catch((e) => setErro(e.message ?? 'Erro ao carregar'))
  }, [ids])

  if (erro) return <div className="p-8 text-sm text-rose-600">{erro}</div>
  if (!data) return <div className="p-8 text-sm text-slate-500">Carregando…</div>

  const clienteLabel =
    data.cliente?.idEtiqueta || data.cliente?.nomeFantasia || data.cliente?.nome || '—'
  const volumes = data.volumes.filter((v) => v.codigo)
  const total = volumes.length

  return (
    <div className="min-h-screen bg-white text-black">
      {/* barra de ação — some na impressão */}
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
        <div className="text-[13px] text-slate-600">
          Etiquetas de entrada · <strong>{clienteLabel}</strong> · {total} volume(s) · 10×3 cm
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
        esquerda={`Entrada · ${ddmmaaaa(data.recebidoEm)}`}
        volumes={volumes.map((v, i) => ({
          id: v.id,
          codigo: v.codigo!,
          direita: `${v.tipo} ${String(i + 1).padStart(2, '0')} de ${String(total).padStart(2, '0')}`,
        }))}
      />
    </div>
  )
}

export default function ImprimirEntradaPage() {
  // useSearchParams exige Suspense no App Router (prerender da rota).
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Carregando…</div>}>
      <ImprimirEntrada />
    </Suspense>
  )
}
