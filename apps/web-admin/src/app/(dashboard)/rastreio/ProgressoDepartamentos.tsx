import type { Departamento } from './types'

/**
 * Barra de progresso pelos departamentos do fluxo — mostra por onde a etiqueta
 * (lâmina/cassete) já passou, onde está e o que falta.
 *   verde = concluído · azul = em processo · âmbar = aguardando próximo · cinza = futuro
 */
export function ProgressoDepartamentos({
  departamentos,
  atual,
  status,
}: {
  departamentos: Departamento[]
  atual?: string | null
  status: string
}) {
  const idx = departamentos.findIndex((d) => d.key === atual)
  const concluido = status === 'concluido'

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
