import type { Departamento } from './types'

/** Siglas curtas (estilo LaborLis) para a barra compacta. */
const SIGLAS: Record<string, string> = {
  recepcao: 'REC',
  macroscopia: 'MAC',
  processamento: 'PROC',
  microtomia: 'MIC',
  coloracao: 'COL',
  imunofluorescencia: 'IF',
  laudo: 'LAU',
  finalizacao: 'FIN',
  expedicao: 'EXP',
  arquivamento: 'ARQ',
  descarte: 'DESC',
}

/** Caminho padrão mostrado na barra compacta — esconde etapas raras/terminais. */
const CORE_KEYS = ['recepcao', 'macroscopia', 'processamento', 'microtomia', 'coloracao', 'laudo', 'expedicao']

function sigla(d: Departamento) {
  return SIGLAS[d.key] ?? d.label.slice(0, 3).toUpperCase()
}

/**
 * Barra de progresso pelos departamentos do fluxo — mostra por onde a etiqueta
 * (lâmina/cassete) já passou, onde está e o que falta.
 *   verde = concluído · azul = em processo · âmbar = aguardando próximo · cinza = futuro
 *
 * `compact` mostra só o processo padrão (siglas) — reduz o ruído das 11 etapas.
 */
export function ProgressoDepartamentos({
  departamentos,
  atual,
  status,
  compact = false,
}: {
  departamentos: Departamento[]
  atual?: string | null
  status: string
  compact?: boolean
}) {
  const concluido = status === 'concluido'
  // Ordem do departamento atual (usa `ordem` p/ posicionar mesmo fora do CORE).
  const ordemAtual = departamentos.find((d) => d.key === atual)?.ordem ?? -1

  const lista = compact
    ? CORE_KEYS.map((k) => departamentos.find((d) => d.key === k)).filter((d): d is Departamento => !!d)
    : departamentos

  if (compact) {
    return (
      <div className="flex items-end gap-1" title={departamentos.map((d) => d.label).join(' → ')}>
        {lista.map((d) => {
          const passou = concluido || (ordemAtual >= 0 && d.ordem < ordemAtual)
          const aqui = ordemAtual >= 0 && d.ordem === ordemAtual
          let bar = 'bg-slate-200 dark:bg-slate-700'
          let txt = 'text-slate-400'
          if (passou) { bar = 'bg-emerald-500'; txt = 'text-emerald-600 dark:text-emerald-300' }
          else if (aqui && status === 'aguardando') { bar = 'bg-amber-500'; txt = 'text-amber-600 dark:text-amber-300' }
          else if (aqui) { bar = 'bg-blue-500'; txt = 'text-blue-600 dark:text-blue-300' }
          return (
            <span key={d.key} className="flex flex-1 flex-col items-center gap-0.5" title={d.label}>
              <span className={`h-1.5 w-full rounded-full ${bar}`} />
              <span className={`text-[8px] font-semibold leading-none ${txt}`}>{sigla(d)}</span>
            </span>
          )
        })}
      </div>
    )
  }

  const idx = departamentos.findIndex((d) => d.key === atual)
  return (
    <div className="flex items-center gap-1" title={departamentos.map((d) => d.label).join(' → ')}>
      {departamentos.map((d, i) => {
        let cls = 'bg-slate-200 dark:bg-slate-700'
        if (concluido || (idx >= 0 && i < idx)) cls = 'bg-emerald-500'
        else if (idx >= 0 && i === idx) cls = status === 'aguardando' ? 'bg-amber-500' : 'bg-blue-500'
        return <span key={d.key} title={d.label} className={`h-1.5 flex-1 rounded-full ${cls}`} />
      })}
    </div>
  )
}
