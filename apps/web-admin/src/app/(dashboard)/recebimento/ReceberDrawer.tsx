'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Package, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { PedidoFila, AmostraItemForm } from './types'

// ─── opções fixas ─────────────────────────────────────────────────────────────

const ESPECIES = [
  { value: 'canino',  label: 'Canino' },
  { value: 'felino',  label: 'Felino' },
  { value: 'bovino',  label: 'Bovino' },
  { value: 'equino',  label: 'Equino' },
  { value: 'suino',   label: 'Suíno' },
  { value: 'humano',  label: 'Humano' },
  { value: 'outro',   label: 'Outro' },
]

const MATERIAIS = [
  { value: 'biopsia_incisional',  label: 'Biópsia Incisional' },
  { value: 'biopsia_excisional',  label: 'Biópsia Excisional' },
  { value: 'peca_cirurgica',      label: 'Peça Cirúrgica' },
  { value: 'citologia',           label: 'Citologia' },
  { value: 'necropsia',           label: 'Necrópsia' },
  { value: 'outro',               label: 'Outro' },
]

const EMPTY_AMOSTRA: AmostraItemForm = {
  numeroCliente: '',
  especie: 'canino',
  material: 'biopsia_incisional',
  localizacao: '',
  observacoes: '',
}

// ─── component ────────────────────────────────────────────────────────────────

interface ReceberDrawerProps {
  open: boolean
  onClose: () => void
  pedido: PedidoFila | null
  onSaved: () => void
}

export function ReceberDrawer({ open, onClose, pedido, onSaved }: ReceberDrawerProps) {
  const [amostras, setAmostras] = useState<AmostraItemForm[]>([{ ...EMPTY_AMOSTRA }])
  const [recebidoPor, setRecebidoPor] = useState('')
  const [qtdPrevista, setQtdPrevista] = useState('')
  const [obsConferencia, setObsConferencia] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && pedido) {
      // Pré-popula com 1 amostra por item do pedido (heurística útil)
      const qtdItens = pedido.itens.reduce((s, it) => s + it.quantidade, 0)
      setAmostras(
        Array.from({ length: Math.max(1, qtdItens) }, () => ({ ...EMPTY_AMOSTRA }))
      )
      setRecebidoPor('')
      setQtdPrevista(String(qtdItens))
      setObsConferencia('')
    }
  }, [open, pedido])

  const previstaNum = parseInt(qtdPrevista, 10)
  const diferenca = Number.isFinite(previstaNum) ? amostras.length - previstaNum : 0

  function setAmostra(i: number, field: keyof AmostraItemForm, value: string) {
    setAmostras((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  function addAmostra() {
    setAmostras((prev) => [...prev, { ...EMPTY_AMOSTRA }])
  }

  function removeAmostra(i: number) {
    setAmostras((prev) => prev.filter((_, idx) => idx !== i))
  }

  function validate(): string | null {
    if (!pedido) return 'Nenhum pedido selecionado.'
    if (amostras.length === 0) return 'Adicione pelo menos uma amostra.'
    for (let i = 0; i < amostras.length; i++) {
      if (!amostras[i].especie) return `Amostra ${i + 1}: informe a espécie.`
      if (!amostras[i].material) return `Amostra ${i + 1}: informe o material.`
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      await api.post('/recebimento/receber', {
        pedidoId: pedido!.id,
        recebidoPor: recebidoPor.trim() || undefined,
        qtdPrevista: Number.isFinite(previstaNum) ? previstaNum : undefined,
        observacaoConferencia: obsConferencia.trim() || undefined,
        amostras: amostras.map((a) => ({
          numeroCliente: a.numeroCliente.trim() || undefined,
          especie: a.especie,
          material: a.material,
          localizacao: a.localizacao.trim() || undefined,
          observacoes: a.observacoes.trim() || undefined,
        })),
      })

      toast.success(`${amostras.length} amostra(s) registrada(s) com sucesso!`)
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar recebimento')
    } finally {
      setSaving(false)
    }
  }

  if (!pedido) return null

  const clienteLabel = pedido.clienteNomeFantasia
    ? `${pedido.clienteNomeFantasia} — ${pedido.clienteNome}`
    : pedido.clienteNome

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Registrar Recebimento"
      subtitle={`${pedido.numero} · ${clienteLabel}`}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Resumo do pedido ── */}
        <section className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <h3 className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Serviços solicitados
            </h3>
          </div>
          <ul className="space-y-1">
            {pedido.itens.map((it, i) => (
              <li key={i} className="flex items-center justify-between text-[12px]">
                <span className="text-slate-700 dark:text-slate-300">
                  <span className="font-mono text-slate-400 mr-1.5">{it.servico.codigo}</span>
                  {it.servico.nome}
                </span>
                <span className="text-slate-400 tabular-nums">× {it.quantidade}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Recebido por ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Dados do recebimento
          </h3>
          <Input
            label="Recebido por"
            value={recebidoPor}
            onChange={(e) => setRecebidoPor(e.target.value)}
            placeholder="Nome do responsável pelo recebimento"
          />
        </section>

        {/* ── Conferência (previsto x recebido) ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Conferência
          </h3>
          <div className="grid grid-cols-3 gap-3 items-end">
            <Input
              label="Qtd prevista"
              type="number"
              min="0"
              value={qtdPrevista}
              onChange={(e) => setQtdPrevista(e.target.value)}
              hint="Padrão = soma do pedido"
            />
            <div>
              <span className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Recebendo</span>
              <div className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] tabular-nums bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200">
                {amostras.length}
              </div>
            </div>
            <div>
              <span className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Diferença</span>
              <div className={`rounded-md border px-3 py-2 text-[13px] tabular-nums font-semibold ${
                diferenca > 0
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
                  : diferenca < 0
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500'
              }`}>
                {diferenca > 0 ? `+${diferenca}` : diferenca}
              </div>
            </div>
          </div>
          {diferenca > 0 && (
            <p className="text-[12px] text-rose-600 dark:text-rose-400">
              Excedente: {diferenca} amostra(s) a mais que o previsto — será sinalizado para cobrança.
            </p>
          )}
          <textarea
            value={obsConferencia}
            onChange={(e) => setObsConferencia(e.target.value)}
            rows={2}
            placeholder="Observação da conferência (opcional) — ex: divergência, condição das amostras…"
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px]
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
          />
        </section>

        {/* ── Amostras ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-slate-400" />
              <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Amostras ({amostras.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={addAmostra}
              className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700
                dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar amostra
            </button>
          </div>

          <div className="space-y-4">
            {amostras.map((a, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 relative"
              >
                {/* Número da amostra + remover */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Amostra {String(i + 1).padStart(2, '0')}
                  </span>
                  {amostras.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAmostra(i)}
                      className="p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50
                        dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Espécie + Material */}
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Espécie *"
                    value={a.especie}
                    onChange={(e) => setAmostra(i, 'especie', e.target.value)}
                    options={ESPECIES}
                  />
                  <Select
                    label="Material *"
                    value={a.material}
                    onChange={(e) => setAmostra(i, 'material', e.target.value)}
                    options={MATERIAIS}
                  />
                </div>

                {/* Nº cliente + Localização */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nº do cliente"
                    value={a.numeroCliente}
                    onChange={(e) => setAmostra(i, 'numeroCliente', e.target.value)}
                    placeholder="Opcional"
                  />
                  <Input
                    label="Localização / Região"
                    value={a.localizacao}
                    onChange={(e) => setAmostra(i, 'localizacao', e.target.value)}
                    placeholder="Ex: abdômen, pele, tórax…"
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Observações
                  </label>
                  <textarea
                    value={a.observacoes}
                    onChange={(e) => setAmostra(i, 'observacoes', e.target.value)}
                    rows={2}
                    placeholder="Condições da amostra, fixação, etc."
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px]
                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      resize-none transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Confirmar recebimento
          </Button>
        </div>

      </form>
    </Drawer>
  )
}
