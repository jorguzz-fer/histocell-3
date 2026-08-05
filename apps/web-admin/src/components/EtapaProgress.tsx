import { ETAPAS_ORDEM, ETAPA_INICIAL, ETAPA_LABEL } from '@/lib/etapas'

type EtapaRec = { etapa: string; status: string }

/**
 * Trilha das etapas da OS em quadradinhos: verde = concluída, azul = onde está.
 * Vive num componente porque a lista de OS e a tela de execução mostram a mesma
 * trilha — duplicá-la faria as duas divergirem na primeira mudança de fluxo.
 */
export function EtapaProgress({
  etapas,
  etapaAtual,
  status,
}: {
  etapas: EtapaRec[]
  etapaAtual: string
  status: string
}) {
  return (
    <div className="flex items-center gap-1">
      {ETAPAS_ORDEM.map((e) => {
        const record = etapas.find((et) => et.etapa === e)
        const concluida = record?.status === 'concluida' || status === 'concluida'
        const atual = e === etapaAtual && status !== 'concluida' && status !== 'cancelada'
        return (
          <div
            key={e}
            title={ETAPA_LABEL[e]}
            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold leading-none transition-colors ${
              concluida
                ? 'bg-emerald-500 text-white'
                : atual
                  ? 'bg-blue-500 text-white ring-2 ring-blue-500/30'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            }`}
          >
            {ETAPA_INICIAL[e]}
          </div>
        )
      })}
    </div>
  )
}
