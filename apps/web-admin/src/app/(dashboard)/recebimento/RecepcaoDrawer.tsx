'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { PedidoFila } from './types'

type TipoRecipiente = { id: number; nome: string }
type Linha = { tipo: string; quantidade: string }

interface Props {
  open: boolean
  onClose: () => void
  pedido: PedidoFila | null
  onSaved: () => void
  /** Abre a impressão (etiquetas dos recipientes) num modal, sem nova aba. */
  onImprimir?: (url: string) => void
}

export function RecepcaoDrawer({ open, onClose, pedido, onSaved, onImprimir }: Props) {
  const [tipos, setTipos] = useState<TipoRecipiente[]>([])
  const [linhas, setLinhas] = useState<Linha[]>([{ tipo: '', quantidade: '1' }])
  const [recebidoPor, setRecebidoPor] = useState('')
  const [saving, setSaving] = useState(false)

  const carregarTipos = () =>
    api.get<TipoRecipiente[]>('/recebimento/tipos-recipiente').then(setTipos).catch(() => {})

  useEffect(() => {
    if (open) {
      carregarTipos()
      setLinhas([{ tipo: '', quantidade: '1' }])
      setRecebidoPor('')
    }
  }, [open])

  function setLinha(i: number, campo: keyof Linha, valor: string) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  async function novoTipo() {
    const nome = window.prompt('Novo tipo de recipiente:')?.trim()
    if (!nome) return
    try {
      await api.post('/recebimento/tipos-recipiente', { nome })
      await carregarTipos()
      toast.success(`Tipo "${nome}" criado.`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao criar tipo')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const recipientes = linhas
      .filter((l) => l.tipo && parseInt(l.quantidade, 10) > 0)
      .map((l) => ({ tipo: l.tipo, quantidade: parseInt(l.quantidade, 10) }))
    if (recipientes.length === 0) {
      toast.error('Informe ao menos um recipiente (tipo + quantidade).')
      return
    }
    setSaving(true)
    try {
      const res = await api.post<{ message: string }>('/recebimento/entrada', {
        pedidoId: pedido!.id,
        recebidoPor: recebidoPor.trim() || undefined,
        recipientes,
      })
      toast.success(res.message ?? 'Entrada registrada.')
      // abre a folha de etiquetas dos recipientes num modal (sem nova aba)
      onImprimir?.(`/imprimir/recipientes/${pedido!.id}`)
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar entrada')
    } finally {
      setSaving(false)
    }
  }

  if (!pedido) return null
  const clienteLabel = pedido.clienteNomeFantasia ?? pedido.clienteNome

  return (
    <Drawer open={open} onClose={onClose} title="Registrar entrada (Recepção)" subtitle={`${pedido.codigoCurto ?? pedido.numero} · ${clienteLabel}`} width="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 text-[12px] text-slate-500 dark:text-slate-400">
          Registre <strong>o que chegou</strong> (recipientes), sem abrir nem contar amostras. Cada recipiente recebe
          uma <strong>etiqueta</strong> (impressa ao registrar). A contagem das amostras é feita no Laboratório.
        </section>

        <Input label="Recebido por" value={recebidoPor} onChange={(e) => setRecebidoPor(e.target.value)} placeholder="Quem recebeu" />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recipientes recebidos</h3>
            </div>
            <button type="button" onClick={novoTipo} className="text-[12px] text-blue-600 hover:text-blue-700 font-medium">+ Novo tipo</button>
          </div>

          {linhas.map((l, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  label=""
                  value={l.tipo}
                  onChange={(e) => setLinha(i, 'tipo', e.target.value)}
                  options={[{ value: '', label: 'Tipo…' }, ...tipos.map((t) => ({ value: t.nome, label: t.nome }))]}
                />
              </div>
              <div className="w-24">
                <Input label="" type="number" min="1" value={l.quantidade} onChange={(e) => setLinha(i, 'quantidade', e.target.value)} />
              </div>
              {linhas.length > 1 && (
                <button type="button" onClick={() => setLinhas((p) => p.filter((_, idx) => idx !== i))}
                  className="p-2 mb-0.5 text-slate-300 hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setLinhas((p) => [...p, { tipo: '', quantidade: '1' }])}
            className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700">
            <Plus className="h-3.5 w-3.5" /> Adicionar recipiente
          </button>
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" loading={saving}>Registrar entrada</Button>
        </div>
      </form>
    </Drawer>
  )
}
