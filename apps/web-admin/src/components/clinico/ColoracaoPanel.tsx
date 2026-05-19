'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { ClinicalIndex, ResolvedClinical } from '@/lib/clinica/types'
import { CadastrarServicoInline } from './CadastrarServicoInline'

interface Props {
  index: ClinicalIndex
  onSelect: (s: Servico) => void | Promise<void>
  onServicoCriado: (s: Servico) => void
}

export function ColoracaoPanel({ index, onSelect, onServicoCriado }: Props) {
  const [open, setOpen]         = useState<Record<string, boolean>>({})
  const [cadastro, setCadastro] = useState<ResolvedClinical | null>(null)

  return (
    <div className="space-y-2">
      <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-1">
        Colorações organizadas pela pergunta clínica — sem decorar o nome da técnica.
      </p>

      {index.coloracaoGrupos.map((g) => {
        const isOpen = !!open[g.pergunta]
        return (
          <div key={g.pergunta} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setOpen((o) => ({ ...o, [g.pergunta]: !o[g.pergunta] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
            >
              <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                {g.pergunta}
                <span className="ml-2 text-[11px] font-normal text-slate-400">· {g.contexto}</span>
              </span>
              {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>

            {isOpen && (
              <div className="p-3 flex flex-wrap gap-2">
                {g.coloracoes.map((c) => {
                  const ofertado = !!c.servico
                  if (ofertado) {
                    return (
                      <button
                        key={c.codigo + c.clinicalName}
                        onClick={() => onSelect(c.servico!)}
                        className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                      >
                        {c.clinicalName}
                      </button>
                    )
                  }
                  return (
                    <button
                      key={c.codigo + c.clinicalName}
                      onClick={() => setCadastro(c)}
                      title="Não ofertado — clique para cadastrar"
                      className="flex items-center gap-1 rounded-full border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-[12px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
                    >
                      {c.clinicalName}
                      <Plus className="h-3 w-3" />
                      <span className="text-[10px]">consultar lab</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

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
