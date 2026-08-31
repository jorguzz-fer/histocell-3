'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Ban, MessageSquare, Printer, ScanLine, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { EtapaProgress } from '@/components/EtapaProgress'
import { api } from '@/lib/api'
import {
  ETAPAS_MOVIVEIS,
  ETAPAS_ORDEM,
  ETAPAS_TERMINAIS,
  ETAPA_LABEL,
} from '@/lib/etapas'
import { clienteDaOS, type OrdemServico } from './types'
import { guiaDaOS } from '@/lib/proximoPasso'
import { fatosDaOS } from './guia'

interface Props {
  open: boolean
  onClose: () => void
  os: OrdemServico | null
  onSaved: () => void
  /** Ações que dependem de um pedido (impressão da OS, comunicação). */
  onImprimir?: (pedidoId: number, numero: string) => void
  onComunicar?: (pedidoId: number, ordemId: number, numero: string) => void
  onConferir?: (ordemId: number, numero: string) => void
  /** Abre a janela de Serviços — o guia aponta para cá quando falta definir. */
  onDefinirServico?: (ordemId: number) => void
}

/**
 * Execução da OS: onde ela está no fluxo e as ações que a movem. Substitui a
 * tela antiga de Ordens — a diferença é que aqui a OS pode não ter amostra
 * (nasceu na Entrada), então o que depende do pedido aparece condicionalmente.
 */
export function ExecucaoOSDrawer({
  open,
  onClose,
  os,
  onSaved,
  onImprimir,
  onComunicar,
  onConferir,
  onDefinirServico,
}: Props) {
  const [destino, setDestino] = useState('')
  const [agindo, setAgindo] = useState(false)

  useEffect(() => {
    if (open) setDestino('')
  }, [open])

  if (!os) return null

  const codigoCurto = os.seq != null ? `#${String(os.seq).padStart(4, '0')}` : os.numero
  const idxAtual = ETAPAS_ORDEM.indexOf(os.etapaAtual as (typeof ETAPAS_ORDEM)[number])
  const proxima = idxAtual >= 0 && idxAtual < ETAPAS_ORDEM.length - 1 ? ETAPAS_ORDEM[idxAtual + 1] : null
  const encerrada = os.status === 'concluida' || os.status === 'cancelada'
  const guia = guiaDaOS(fatosDaOS(os))

  async function acao(fn: () => Promise<unknown>, sucesso: string) {
    setAgindo(true)
    try {
      await fn()
      toast.success(sucesso)
      onSaved()
    } catch (err: any) {
      toast.error(err.message ?? 'Não foi possível concluir a ação')
    } finally {
      setAgindo(false)
    }
  }

  const avancar = () =>
    acao(
      () => api.patch(`/ordens/${os.id}/avancar`, {}),
      proxima ? `OS ${codigoCurto} avançada para ${ETAPA_LABEL[proxima]}.` : `OS ${codigoCurto} concluída!`,
    )

  const mover = () => {
    if (!destino) {
      toast.error('Escolha o destino.')
      return
    }
    const terminal = ETAPAS_TERMINAIS.includes(destino)
    return acao(
      () => api.patch(`/ordens/${os.id}/mover`, { etapa: destino }),
      terminal
        ? `OS ${codigoCurto} movida para ${ETAPA_LABEL[destino]} e concluída.`
        : `OS ${codigoCurto} movida para ${ETAPA_LABEL[destino]}.`,
    )
  }

  const cancelar = () => {
    if (!confirm(`Cancelar a OS ${codigoCurto}? A ação não pode ser desfeita.`)) return
    return acao(() => api.patch(`/ordens/${os.id}/cancelar`, {}), `OS ${codigoCurto} cancelada.`)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Execução da OS ${codigoCurto}`}
      subtitle={clienteDaOS(os)} width="max-w-xl"
    >
      <div className="space-y-5">
        <section className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Onde está
            </span>
            <Badge variant={encerrada ? 'slate' : 'blue'}>
              {ETAPA_LABEL[os.etapaAtual] ?? os.etapaAtual}
            </Badge>
          </div>
          <EtapaProgress etapas={os.etapas ?? []} etapaAtual={os.etapaAtual} status={os.status} />
          {os.responsavel && (
            <p className="text-[12px] text-slate-500">Responsável: {os.responsavel}</p>
          )}
          {/* O que falta para liberar o que está pendente — mesma fonte do guia
              das listas (lib/proximoPasso). */}
          {guia.dicas.map((dica) => (
            <p
              key={dica}
              className="rounded border-l-2 border-amber-400 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800 dark:bg-amber-900/15 dark:text-amber-300"
            >
              {dica}
            </p>
          ))}
        </section>

        {encerrada ? (
          <p className="rounded-md border border-dashed border-slate-200 py-6 text-center text-[12px] text-slate-400 dark:border-slate-700">
            OS {os.status === 'concluida' ? 'concluída' : 'cancelada'} — sem ações de execução.
          </p>
        ) : (
          <>
            {guia.primaria?.tipo === 'definir_servico' && (
              <section className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Próximo passo
                </span>
                <Button
                  onClick={() => onDefinirServico?.(os.id)}
                  className="w-full justify-center"
                >
                  {guia.primaria.rotulo}
                </Button>
              </section>
            )}

            <section className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Avançar no fluxo
              </span>
              <Button onClick={avancar} loading={agindo} className="w-full justify-center">
                <ArrowRight className="h-4 w-4" />
                {proxima ? `Avançar para ${ETAPA_LABEL[proxima]}` : 'Concluir OS'}
              </Button>
            </section>

            <section className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Desviar do fluxo
              </span>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label=""
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    options={[
                      { value: '', label: 'Mover para…' },
                      ...ETAPAS_MOVIVEIS.filter((e) => e !== os.etapaAtual).map((e) => ({
                        value: e,
                        label: ETAPA_LABEL[e] + (ETAPAS_TERMINAIS.includes(e) ? ' (conclui)' : ''),
                      })),
                    ]}
                  />
                </div>
                <Button variant="secondary" onClick={mover} disabled={!destino || agindo}>
                  <Shuffle className="h-3.5 w-3.5" />
                  Mover
                </Button>
              </div>
            </section>
          </>
        )}

        <section className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Outras ações
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onConferir?.(os.id, codigoCurto)}
              // Toda OS passa pela conferência de saída: lâminas etiquetadas são
              // bipadas uma a uma, e o código da própria OS é o carimbo final —
              // inclusive na OS da Entrada, que não tem etiqueta nenhuma.
              title="Conferência de saída (bipagem)"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Conferência
            </Button>

            {os.amostra?.pedido && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onComunicar?.(os.amostra!.pedido.id, os.id, os.numero)}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comunicar cliente
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onImprimir?.(os.amostra!.pedido.id, os.numero)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir OS
                </Button>
              </>
            )}

            {!encerrada && (
              <Button variant="danger" size="sm" onClick={cancelar} disabled={agindo}>
                <Ban className="h-3.5 w-3.5" />
                Cancelar OS
              </Button>
            )}
          </div>
        </section>

        <div className="flex justify-end border-t border-slate-200 pt-3 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
