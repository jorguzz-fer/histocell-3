'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Clock, LogIn, LogOut, Maximize2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Departamento, RastreioEtiqueta } from '@/app/(dashboard)/rastreio/types'

type Lista = { data: RastreioEtiqueta[]; meta: { total: number } }

function desde(iso?: string | null) {
  if (!iso) return ''
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  return `há ${h}h ${min % 60}min`
}

function TvCard({ e, tone }: { e: RastreioEtiqueta; tone: 'verde' | 'ambar' }) {
  const cli = e.amostra.pedido.cliente.nomeFantasia ?? e.amostra.pedido.cliente.nome
  const ring = tone === 'verde' ? 'border-emerald-500/40' : 'border-amber-500/40'
  return (
    <div className={`bg-slate-900 border ${ring} rounded-xl px-5 py-4`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-2xl font-bold tracking-tight text-white">{e.codigo}</span>
        <span className="text-base text-slate-400 flex items-center gap-1.5 shrink-0">
          <Clock className="h-4 w-4" /> {desde(e.ultimoEventoEm)}
        </span>
      </div>
      <div className="mt-1 text-lg text-slate-200 truncate">
        {e.identificacao ?? '—'} {e.coloracao ? <span className="text-slate-400">· {e.coloracao}</span> : null}
      </div>
      <div className="text-base text-slate-400 truncate">
        Histocell {e.amostra.numeroInterno} · {cli}
      </div>
    </div>
  )
}

function Coluna({
  titulo,
  tone,
  itens,
}: {
  titulo: string
  tone: 'verde' | 'ambar'
  itens: RastreioEtiqueta[]
}) {
  const head = tone === 'verde' ? 'text-emerald-400' : 'text-amber-400'
  const Icon = tone === 'verde' ? LogIn : LogOut
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className={`flex items-center gap-3 mb-4 ${head}`}>
        <Icon className="h-7 w-7" />
        <h2 className="text-2xl font-bold uppercase tracking-wide">{titulo}</h2>
        <span className="ml-auto text-3xl font-black tabular-nums">{itens.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto grid grid-cols-1 2xl:grid-cols-2 gap-3 content-start pr-1">
        {itens.length === 0 ? (
          <p className="col-span-full text-center text-slate-600 text-lg py-16 border border-dashed border-slate-800 rounded-xl">
            —
          </p>
        ) : (
          itens.map((e) => <TvCard key={e.id} e={e} tone={tone} />)
        )}
      </div>
    </div>
  )
}

export default function RastreioTvPage() {
  const params = useParams<{ key: string }>()
  const key = params.key

  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [emProcesso, setEmProcesso] = useState<RastreioEtiqueta[]>([])
  const [prontos, setProntos] = useState<RastreioEtiqueta[]>([])
  const [agora, setAgora] = useState<Date>(new Date())

  useEffect(() => {
    api.get<Departamento[]>('/rastreio/departamentos').then(setDepartamentos).catch(() => {})
  }, [])

  const carregar = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        api.get<Lista>(`/rastreio?departamento=${key}&status=em_andamento&limit=100`),
        api.get<Lista>(`/rastreio?departamento=${key}&status=aguardando&limit=100`),
      ])
      setEmProcesso(a.data)
      setProntos(b.data)
    } catch {
      /* silencioso no painel */
    }
  }, [key])

  useEffect(() => {
    carregar()
    const id = setInterval(carregar, 5000)
    return () => clearInterval(id)
  }, [carregar])

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const label = departamentos.find((d) => d.key === key)?.label ?? key

  function fullscreen() {
    const el = document.documentElement
    if (!document.fullscreenElement) el.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col p-6 overflow-hidden">
      <header className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-4xl font-black tracking-tight">{label}</h1>
          <p className="text-slate-500 text-base mt-0.5">Fila do departamento · atualização automática</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-4xl font-bold tabular-nums leading-none">
              {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-slate-500 text-sm mt-1">
              {agora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
            </div>
          </div>
          <button
            onClick={fullscreen}
            title="Tela cheia"
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex gap-6">
        <Coluna titulo="Em processo" tone="verde" itens={emProcesso} />
        <div className="w-px bg-slate-800 shrink-0" />
        <Coluna titulo="Prontos / saíram" tone="ambar" itens={prontos} />
      </div>
    </div>
  )
}
