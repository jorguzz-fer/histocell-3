'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { AcaoGuia, GuiaOS } from '@/lib/proximoPasso'

/**
 * A tríade do guia (plano "O próximo passo"): chip da fase, próxima ação
 * nomeada e dica de liberação — o mesmo desenho em toda tela do processo.
 *
 * `compacto` é a versão de linha de lista (chip + botão primário, dica no
 * title); a versão cheia inclui as dicas como faixa e a ação secundária.
 */
export function GuiaProximoPasso({
  guia,
  onAcao,
  compacto = false,
  agindo = false,
}: {
  guia: GuiaOS
  onAcao: (acao: AcaoGuia) => void
  compacto?: boolean
  agindo?: boolean
}) {
  const chip = (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        guia.encerrada
          ? 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400'
          : 'border-blue-400 text-blue-700 dark:border-blue-500 dark:text-blue-400'
      }`}
      title={guia.dicas.join(' ')}
    >
      {guia.chip}
    </span>
  )

  if (compacto) {
    return (
      <span className="inline-flex items-center gap-2">
        {chip}
        {guia.dicas.length > 0 && (
          <AlertTriangle
            className="h-3.5 w-3.5 shrink-0 text-amber-500"
            aria-label={guia.dicas.join(' ')}
          />
        )}
        {guia.primaria && (
          <Button
            size="sm"
            variant={guia.primaria.tipo === 'definir_servico' ? 'primary' : 'secondary'}
            disabled={!guia.primaria.habilitada || agindo}
            title={!guia.primaria.habilitada ? guia.dicas.join(' ') : undefined}
            onClick={() => onAcao(guia.primaria!)}
          >
            {guia.primaria.rotulo}
          </Button>
        )}
      </span>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {chip}
        {guia.primaria && (
          <Button
            size="sm"
            disabled={!guia.primaria.habilitada || agindo}
            title={!guia.primaria.habilitada ? guia.dicas.join(' ') : undefined}
            onClick={() => onAcao(guia.primaria!)}
          >
            {guia.primaria.rotulo}
          </Button>
        )}
        {guia.secundaria && (
          <Button
            size="sm"
            variant="secondary"
            disabled={!guia.secundaria.habilitada || agindo}
            onClick={() => onAcao(guia.secundaria!)}
          >
            {guia.secundaria.rotulo}
          </Button>
        )}
      </div>
      {guia.dicas.map((dica) => (
        <p
          key={dica}
          className="rounded border-l-2 border-amber-400 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800 dark:bg-amber-900/15 dark:text-amber-300"
        >
          {dica}
        </p>
      ))}
    </div>
  )
}
