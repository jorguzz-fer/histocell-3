'use client'

import { useMemo, useState } from 'react'
import { Search, Layers, Plus } from 'lucide-react'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { ClinicalIndex, IHCMarkerResolved, ResolvedClinical } from '@/lib/clinica/types'
import { expandPanel } from '@/lib/clinica/resolver'
import { CadastrarServicoInline } from './CadastrarServicoInline'

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

interface Props {
  index: ClinicalIndex
  onSelect: (s: Servico) => void | Promise<void>
  onServicoCriado: (s: Servico) => void
}

export function IHCPanel({ index, onSelect, onServicoCriado }: Props) {
  const [clientAntibody, setClientAntibody] = useState(false)
  const [query, setQuery]                   = useState('')
  const [cadastro, setCadastro]             = useState<ResolvedClinical | null>(null)

  // Família ativa estrita: só a escolhida pelo toggle (sem fallback cruzado —
  // não faturar na tabela errada de anticorpo).
  function activeRes(m: IHCMarkerResolved): ResolvedClinical | null {
    return clientAntibody ? m.cliente : m.histocell
  }

  const markers = useMemo(() => {
    const q = norm(query.trim())
    const base = q
      ? index.ihcMarkers.filter((m) => norm(m.clinicalName).includes(q) || norm(m.markerKey).includes(q))
      : index.ihcMarkers
    return base.slice(0, q ? 120 : 80)
  }, [index.ihcMarkers, query])

  async function applyPanel(nome: string) {
    const panel = index.ihcPaineis.find((p) => p.nome === nome)
    if (!panel) return
    const servicos = expandPanel(panel, clientAntibody)
    for (const s of servicos) await onSelect(s)
  }

  return (
    <div className="space-y-4">
      {/* Header + toggle A/C */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          {index.ihcMarkers.length} marcadores · painéis clínicos de 1 clique
        </p>
        <button
          onClick={() => setClientAntibody((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5"
        >
          <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">A/C do cliente?</span>
          <span className={`relative inline-block w-9 h-5 rounded-full transition-colors ${clientAntibody ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full transition-all ${clientAntibody ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>

      {/* Painéis */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
          Painéis clínicos
        </p>
        <div className="flex flex-wrap gap-2">
          {index.ihcPaineis.map((p) => (
            <button
              key={p.nome}
              onClick={() => applyPanel(p.nome)}
              title={p.descricao}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
            >
              <Layers className="h-3.5 w-3.5 text-blue-500" />
              {p.nome}
              <span className="text-[10px] text-slate-400">· {p.cobertura}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar marcador (ex: Ki67, CD20, P53…)"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
      </div>

      {/* Marcadores */}
      <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto content-start pr-1">
        {markers.map((m) => {
          const res = activeRes(m)
          const ofertado = !!res?.servico
          if (ofertado) {
            return (
              <button
                key={m.markerKey}
                onClick={() => onSelect(res!.servico!)}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
              >
                {m.clinicalName}
              </button>
            )
          }
          const cadastroAlvo: ResolvedClinical = res ?? {
            clinicalName: m.clinicalName,
            codigo: '',
            servico: null,
            suggested: { categoria: 'Imunohistoquímica', precoRotina: 0, precoPesquisa: 0 },
          }
          return (
            <button
              key={m.markerKey}
              onClick={() => setCadastro(cadastroAlvo)}
              title="Não ofertado — clique para cadastrar"
              className="flex items-center gap-1 rounded-full border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-[12px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
            >
              {m.clinicalName}
              <Plus className="h-3 w-3" />
              <span className="text-[10px]">consultar lab</span>
            </button>
          )
        })}
      </div>

      {cadastro && (
        <CadastrarServicoInline
          item={cadastro}
          onClose={() => setCadastro(null)}
          onCriado={(s) => { onServicoCriado(s); onSelect(s) }}
        />
      )}
    </div>
  )
}
