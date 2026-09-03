'use client'

import { useCallback, useEffect, useState } from 'react'
import { FlaskConical, Microscope, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ServicoSearchInput } from '@/components/ui/ServicoSearchInput'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import { clienteDaOS, type OrdemServico } from './types'

interface Props {
  open: boolean
  onClose: () => void
  os: OrdemServico | null
  onSaved: () => void
}

type VolumeMacro = { id: number; tipo: string; paciente: string | null; codigo: string | null }
type Peca = {
  id: number
  paciente: string | null
  descricao: string
  medidas: string | null
  caracteristicas: string | null
  cor: string | null
  consistencia: string | null
  numeroCassetes: number
  servicoId: number | null
  servicoCodigo: string | null
  servicoNome: string | null
}

const FORM_VAZIO = {
  paciente: '',
  descricao: '',
  medidas: '',
  caracteristicas: '',
  cor: '',
  consistencia: '',
  numeroCassetes: '1',
  servicoId: '',
}

/**
 * Ficha de Macroscopia (reunião 02/09): a macroscopista abre o pote, descreve
 * as peças (medidas, características) e determina os cassetes. Ao concluir, cada
 * peça vira um item de cobrança e gera as etiquetas de cassete — a OS avança
 * para o Processamento.
 */
export function MacroscopiaModal({ open, onClose, os, onSaved }: Props) {
  const [volumes, setVolumes] = useState<VolumeMacro[]>([])
  const [pecas, setPecas] = useState<Peca[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [form, setForm] = useState({ ...FORM_VAZIO })
  const [salvando, setSalvando] = useState(false)
  const [concluindo, setConcluindo] = useState(false)

  const carregar = useCallback(async () => {
    if (!os) return
    try {
      const res = await api.get<{ volumes: VolumeMacro[]; pecas: Peca[] }>(
        `/ordens/${os.id}/macroscopia`,
      )
      setVolumes(res.volumes)
      setPecas(res.pecas)
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao carregar a ficha')
    }
  }, [os])

  useEffect(() => {
    if (!open || !os) return
    setForm({ ...FORM_VAZIO })
    carregar()
    api.get<Servico[]>('/pedidos/servicos').then(setServicos).catch(() => {})
  }, [open, os, carregar])

  function setCampo(campo: keyof typeof FORM_VAZIO, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function adicionarPeca() {
    if (!os) return
    if (!form.descricao.trim()) {
      toast.error('Descreva a peça (ex.: pele, baço, nódulo).')
      return
    }
    setSalvando(true)
    try {
      await api.post(`/ordens/${os.id}/macroscopia`, {
        descricao: form.descricao.trim(),
        paciente: form.paciente.trim() || undefined,
        medidas: form.medidas.trim() || undefined,
        caracteristicas: form.caracteristicas.trim() || undefined,
        cor: form.cor.trim() || undefined,
        consistencia: form.consistencia.trim() || undefined,
        numeroCassetes: Math.max(1, parseInt(form.numeroCassetes, 10) || 1),
        servicoId: form.servicoId ? Number(form.servicoId) : undefined,
      })
      setForm({ ...FORM_VAZIO })
      await carregar()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao adicionar peça')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: number) {
    try {
      await api.delete(`/ordens/macroscopia/${id}`)
      await carregar()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao remover')
    }
  }

  async function concluir() {
    if (!os) return
    setConcluindo(true)
    try {
      const res = await api.post<{ message: string }>(`/ordens/${os.id}/macroscopia/concluir`, {})
      toast.success(res.message)
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao concluir a macroscopia')
    } finally {
      setConcluindo(false)
    }
  }

  if (!os) return null

  const codigoCurto = os.seq != null ? `#${String(os.seq).padStart(4, '0')}` : os.numero
  const totalCassetes = pecas.reduce((s, p) => s + p.numeroCassetes, 0)
  const semServico = pecas.filter((p) => p.servicoId == null).length
  const podeConcluir = pecas.length > 0 && semServico === 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Macroscopia da OS ${codigoCurto}`}
      subtitle={clienteDaOS(os)}
      width="max-w-3xl"
      altura="cheia"
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
          Abra cada pote, descreva as peças e diga quantos cassetes cada uma gera. Ao{' '}
          <strong>concluir</strong>, as peças viram cobrança e cassetes, e a OS avança para o
          Processamento.
        </section>

        {/* Pacotes recebidos para a macroscopia */}
        {volumes.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Pacotes recebidos ({volumes.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {volumes.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {v.paciente && <span className="font-medium text-slate-700 dark:text-slate-200">{v.paciente}</span>}
                  {v.tipo}
                  <span className="font-mono text-slate-400">{v.codigo}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Nova peça */}
        <section className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-500/40 dark:bg-violet-500/5">
          <div className="flex items-center gap-2">
            <Microscope className="h-4 w-4 text-violet-500" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Descrever peça
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              label=""
              value={form.paciente}
              onChange={(e) => setCampo('paciente', e.target.value)}
              options={[
                { value: '', label: 'Paciente…' },
                ...volumes
                  .filter((v) => v.paciente)
                  .map((v) => ({ value: v.paciente as string, label: v.paciente as string })),
              ]}
            />
            <Input
              label=""
              value={form.descricao}
              onChange={(e) => setCampo('descricao', e.target.value)}
              placeholder="Peça (ex.: pele, baço, nódulo)"
            />
            <Input
              label=""
              value={form.medidas}
              onChange={(e) => setCampo('medidas', e.target.value)}
              placeholder="Medidas (ex.: 2 x 3 x 1 cm)"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label=""
                value={form.cor}
                onChange={(e) => setCampo('cor', e.target.value)}
                placeholder="Cor"
              />
              <Input
                label=""
                value={form.consistencia}
                onChange={(e) => setCampo('consistencia', e.target.value)}
                placeholder="Consistência"
              />
            </div>
          </div>
          <Input
            label=""
            value={form.caracteristicas}
            onChange={(e) => setCampo('caracteristicas', e.target.value)}
            placeholder="Características (cutâneo, firme, amarelado, regular, lobulado…)"
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <ServicoSearchInput
                servicos={servicos}
                value={form.servicoId}
                onChange={(id) => setCampo('servicoId', id)}
              />
            </div>
            <div className="w-24">
              <Input
                label=""
                type="number"
                min="1"
                value={form.numeroCassetes}
                onChange={(e) => setCampo('numeroCassetes', e.target.value)}
                hint="cassetes"
              />
            </div>
            <Button onClick={adicionarPeca} loading={salvando} disabled={!form.descricao.trim()}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </section>

        {/* Peças descritas */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Peças descritas ({pecas.length})
          </h3>
          {pecas.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 py-6 text-center text-[12px] text-slate-400 dark:border-slate-700">
              Nenhuma peça descrita ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pecas.map((p) => (
                <div key={p.id} className="flex items-start gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-slate-800 dark:text-slate-200">
                      {p.paciente && <span className="font-medium">{p.paciente} · </span>}
                      {p.descricao}
                      <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                        {p.numeroCassetes} cassete{p.numeroCassetes > 1 ? 's' : ''}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {[p.medidas, p.cor, p.consistencia, p.caracteristicas]
                        .filter(Boolean)
                        .join(' · ') || 'sem descrição'}
                    </p>
                    <p className="text-[11px]">
                      {p.servicoId ? (
                        <span className="text-slate-500">
                          <span className="font-mono text-slate-400">{p.servicoCodigo}</span>{' '}
                          {p.servicoNome}
                        </span>
                      ) : (
                        <span className="text-amber-600">sem serviço — defina para poder concluir</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(p.id)}
                    className="shrink-0 p-1.5 text-slate-300 hover:text-rose-500"
                    title="Remover peça"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
          <span className="text-[12px] text-slate-500">
            {pecas.length > 0 && (
              <>
                <FlaskConical className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
                {totalCassetes} cassete(s) a gerar
                {semServico > 0 && (
                  <span className="ml-2 text-amber-600">· {semServico} peça(s) sem serviço</span>
                )}
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={concluir} loading={concluindo} disabled={!podeConcluir}>
              Concluir e gerar cassetes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
