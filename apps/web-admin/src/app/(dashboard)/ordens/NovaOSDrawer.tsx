'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FlaskConical } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { AmostraPendente } from './types'

const PRIORIDADE_OPTS = [
  { value: 'normal',  label: 'Normal' },
  { value: 'urgente', label: 'Urgente' },
]

function labelMaterial(m: string) {
  const MAP: Record<string, string> = {
    biopsia_incisional: 'Biópsia Incisional',
    biopsia_excisional: 'Biópsia Excisional',
    peca_cirurgica:     'Peça Cirúrgica',
    citologia:          'Citologia',
    necropsia:          'Necrópsia',
    outro:              'Outro',
  }
  return MAP[m] ?? m
}

interface NovaOSDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function NovaOSDrawer({ open, onClose, onSaved }: NovaOSDrawerProps) {
  const [pendentes, setPendentes]     = useState<AmostraPendente[]>([])
  const [loading, setLoading]         = useState(false)
  const [amostraId, setAmostraId]     = useState('')
  const [prioridade, setPrioridade]   = useState('normal')
  const [responsavel, setResponsavel] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (open) {
      setAmostraId('')
      setPrioridade('normal')
      setResponsavel('')
      setObservacoes('')
      loadPendentes()
    }
  }, [open])

  async function loadPendentes() {
    setLoading(true)
    try {
      const data = await api.get<AmostraPendente[]>('/ordens/pendentes')
      setPendentes(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar amostras pendentes')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amostraId) { toast.error('Selecione uma amostra.'); return }

    setSaving(true)
    try {
      await api.post('/ordens', {
        amostraId: parseInt(amostraId),
        prioridade,
        responsavel: responsavel.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      })
      toast.success('OS criada com sucesso!')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao criar OS')
    } finally {
      setSaving(false)
    }
  }

  const amostraOpts = [
    { value: '', label: 'Selecione a amostra…' },
    ...pendentes.map((a) => ({
      value: String(a.id),
      label: `${a.numeroInterno} · ${a.pedido.cliente.nomeFantasia ?? a.pedido.cliente.nome} · ${labelMaterial(a.material)} (${a.especie})`,
    })),
  ]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nova Ordem de Serviço"
      subtitle="Selecione a amostra e configure a OS"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Amostras pendentes */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Amostra *
          </h3>

          {loading ? (
            <div className="flex items-center gap-2 text-[13px] text-slate-400 py-2">
              <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Carregando amostras…
            </div>
          ) : pendentes.length === 0 ? (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-5 text-center">
              <FlaskConical className="h-5 w-5 text-slate-300 mx-auto mb-2" />
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                Nenhuma amostra aguardando OS
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Receba amostras no módulo de Recebimento primeiro.
              </p>
            </div>
          ) : (
            <>
              <Select
                label="Amostra"
                value={amostraId}
                onChange={(e) => setAmostraId(e.target.value)}
                options={amostraOpts}
              />

              {/* Preview da amostra selecionada */}
              {amostraId && (() => {
                const a = pendentes.find((p) => String(p.id) === amostraId)
                if (!a) return null
                return (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 p-3 space-y-1 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{a.numeroInterno}</span>
                      <span className="text-blue-500 capitalize">{a.especie}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      {a.pedido.cliente.nomeFantasia ?? a.pedido.cliente.nome}
                      <span className="mx-1.5 text-slate-300">·</span>
                      {labelMaterial(a.material)}
                      {a.localizacao && <span> · {a.localizacao}</span>}
                    </div>
                    <div className="text-slate-400">
                      Pedido: <span className="font-mono">{a.pedido.numero}</span>
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </section>

        {/* Configuração */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Configuração
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Prioridade"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
              options={PRIORIDADE_OPTS}
            />
            <Input
              label="Responsável"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Técnico responsável"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Instruções especiais, cuidados…"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px]
                bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
            />
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={!amostraId}>
            Criar OS
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
