'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, LogIn, LogOut, Tv, FileText } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { OSModal } from '@/components/OSModal'
import { api } from '@/lib/api'
import { ScanBox } from '../../ScanBox'
import type { Departamento, RastreioEtiqueta } from '../../types'

type Lista = { data: RastreioEtiqueta[]; meta: { total: number } }

function desde(iso?: string | null) {
  if (!iso) return ''
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  return `há ${h}h ${min % 60}min`
}

function Card({ e, onVerOS }: { e: RastreioEtiqueta; onVerOS: (pedidoId: number, numero: string) => void }) {
  const cli = e.amostra.pedido.cliente.nomeFantasia ?? e.amostra.pedido.cliente.nome
  const prevista = e.amostra.pedido.qtdPrevista
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[13px] font-semibold text-slate-800 dark:text-slate-200">
          {e.codigo}
        </span>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="h-3 w-3" /> {desde(e.ultimoEventoEm)}
        </span>
      </div>
      <div className="text-[12px] text-slate-600 dark:text-slate-300 mt-1 truncate">
        {e.identificacao ?? '—'} {e.coloracao ? `· ${e.coloracao}` : ''}
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate">Histocell {e.amostra.numeroInterno} · {cli}</span>
        {prevista != null && prevista > 0 && (
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold">
            {prevista} no orçamento
          </span>
        )}
      </div>
      {/* Acesso à OS: serviços solicitados + quantidades (sem valores) para a técnica. */}
      <button
        onClick={() => onVerOS(e.amostra.pedido.id, e.amostra.pedido.numero)}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        <FileText className="h-3 w-3" /> Ver OS / serviços
      </button>
    </div>
  )
}

export default function DepartamentoBoardPage() {
  const params = useParams<{ key: string }>()
  const key = params.key

  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [emProcesso, setEmProcesso] = useState<RastreioEtiqueta[]>([])
  const [prontos, setProntos] = useState<RastreioEtiqueta[]>([])
  const [osModal, setOsModal] = useState<{ pedidoId: number; numero: string } | null>(null)

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

  const label = departamentos.find((d) => d.key === key)?.label ?? key

  return (
    <div className="space-y-6">
      <PageHeader
        title={label}
        subtitle="Fila do departamento — atualiza automaticamente"
        action={
          <div className="flex items-center gap-4">
            <a
              href={`/rastreio-tv/${key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <Tv className="h-4 w-4" /> Modo TV
            </a>
            <Link
              href="/rastreio"
              className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Rastreio
            </Link>
          </div>
        }
      />

      <ScanBox departamentos={departamentos} fixedDepartamento={key} onScanned={carregar} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Em processo (entrou) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <LogIn className="h-4 w-4" /> Em processo
            </span>
            <span className="text-[12px] text-slate-400">({emProcesso.length})</span>
          </div>
          <div className="space-y-2">
            {emProcesso.length === 0 ? (
              <p className="text-[12px] text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                Nada em processo.
              </p>
            ) : (
              emProcesso.map((e) => <Card key={e.id} e={e} onVerOS={(pedidoId, numero) => setOsModal({ pedidoId, numero })} />)
            )}
          </div>
        </div>

        {/* Prontos / saíram (aguardando próximo) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <LogOut className="h-4 w-4" /> Prontos / saíram
            </span>
            <span className="text-[12px] text-slate-400">({prontos.length})</span>
          </div>
          <div className="space-y-2">
            {prontos.length === 0 ? (
              <p className="text-[12px] text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                Nada aguardando saída.
              </p>
            ) : (
              prontos.map((e) => <Card key={e.id} e={e} onVerOS={(pedidoId, numero) => setOsModal({ pedidoId, numero })} />)
            )}
          </div>
        </div>
      </div>

      <OSModal
        open={osModal != null}
        pedidoId={osModal?.pedidoId ?? null}
        osNumero={osModal?.numero}
        onClose={() => setOsModal(null)}
      />
    </div>
  )
}
