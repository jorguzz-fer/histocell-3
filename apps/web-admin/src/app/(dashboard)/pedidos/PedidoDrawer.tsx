'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { Pedido, Servico, ClienteSimples } from './types'

// ─── tipos internos ───────────────────────────────────────────────────────────

type ItemForm = {
  servicoId: string
  quantidade: string
  preco: string
  desconto: string
}

type FormState = {
  clienteId: string
  observacoes: string
  status: string
  itens: ItemForm[]
}

const EMPTY_ITEM: ItemForm = { servicoId: '', quantidade: '1', preco: '', desconto: '0' }

const EMPTY: FormState = {
  clienteId: '',
  observacoes: '',
  status: 'rascunho',
  itens: [{ ...EMPTY_ITEM }],
}

const STATUS_OPTS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado',  label: 'Enviado' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'cancelado', label: 'Cancelado' },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function itemSubtotal(item: ItemForm): number {
  const preco = parseFloat(item.preco) || 0
  const qty   = parseInt(item.quantidade) || 0
  const desc  = parseFloat(item.desconto) || 0
  return preco * qty * (1 - desc / 100)
}

function pedidoToForm(p: Pedido): FormState {
  return {
    clienteId: String(p.clienteId),
    observacoes: p.observacoes ?? '',
    status: p.status,
    itens: p.itens.length > 0
      ? p.itens.map((i) => ({
          servicoId: String(i.servicoId),
          quantidade: String(i.quantidade),
          preco: String(i.preco),
          desconto: String(i.desconto),
        }))
      : [{ ...EMPTY_ITEM }],
  }
}

// ─── component ────────────────────────────────────────────────────────────────

interface PedidoDrawerProps {
  open: boolean
  onClose: () => void
  pedido: Pedido | null
  onSaved: () => void
}

export function PedidoDrawer({ open, onClose, pedido, onSaved }: PedidoDrawerProps) {
  const isEdit = Boolean(pedido)

  const [form, setForm] = useState<FormState>(EMPTY)
  const [clientes, setClientes] = useState<ClienteSimples[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingPreco, setLoadingPreco] = useState<number | null>(null) // índice do item carregando preço

  // Carrega listas de clientes e serviços uma única vez ao abrir
  const loadLists = useCallback(async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get<{ data: ClienteSimples[] }>('/clientes?limit=200&ativo=true'),
        api.get<Servico[]>('/pedidos/servicos'),
      ])
      setClientes(cRes.data ?? [])
      setServicos(sRes ?? [])
    } catch {
      toast.error('Erro ao carregar clientes/serviços')
    }
  }, [])

  useEffect(() => {
    if (open) {
      setForm(pedido ? pedidoToForm(pedido) : EMPTY)
      loadLists()
    }
  }, [open, pedido, loadLists])

  // ── helpers de form ────────────────────────────────────────────────────────

  function setField(field: keyof Omit<FormState, 'itens'>, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function setItem(index: number, field: keyof ItemForm, value: string) {
    setForm((f) => {
      const itens = [...f.itens]
      itens[index] = { ...itens[index], [field]: value }
      return { ...f, itens }
    })
  }

  function addItem() {
    setForm((f) => ({ ...f, itens: [...f.itens, { ...EMPTY_ITEM }] }))
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== index) }))
  }

  // Ao selecionar serviço: busca preço para o cliente selecionado
  async function handleServicoChange(index: number, servicoId: string) {
    setItem(index, 'servicoId', servicoId)
    if (!servicoId || !form.clienteId) return

    setLoadingPreco(index)
    try {
      const res = await api.get<{ preco: number; desconto: number }>(
        `/pedidos/preco?clienteId=${form.clienteId}&servicoId=${servicoId}`,
      )
      setForm((f) => {
        const itens = [...f.itens]
        itens[index] = {
          ...itens[index],
          servicoId,
          preco: String(res.preco),
          desconto: String(res.desconto),
        }
        return { ...f, itens }
      })
    } catch {
      // sem preço customizado — usa precoBase do objeto local
      const s = servicos.find((s) => s.id === parseInt(servicoId))
      if (s) setItem(index, 'preco', String(s.precoBase))
    } finally {
      setLoadingPreco(null)
    }
  }

  // ── validação ──────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.clienteId) return 'Selecione um cliente.'
    if (form.itens.length === 0) return 'Adicione pelo menos um item.'
    for (let i = 0; i < form.itens.length; i++) {
      const it = form.itens[i]
      if (!it.servicoId) return `Item ${i + 1}: selecione o serviço.`
      if (!parseInt(it.quantidade) || parseInt(it.quantidade) < 1)
        return `Item ${i + 1}: quantidade inválida.`
      if (!it.preco || parseFloat(it.preco) < 0)
        return `Item ${i + 1}: preço inválido.`
    }
    return null
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      const payload = {
        clienteId: parseInt(form.clienteId),
        observacoes: form.observacoes.trim() || undefined,
        ...(isEdit ? { status: form.status } : {}),
        itens: form.itens.map((it) => ({
          servicoId: parseInt(it.servicoId),
          quantidade: parseInt(it.quantidade),
          preco: parseFloat(it.preco),
          desconto: parseFloat(it.desconto) || 0,
        })),
      }

      if (isEdit && pedido) {
        await api.patch(`/pedidos/${pedido.id}`, payload)
        toast.success('Pedido atualizado com sucesso!')
      } else {
        await api.post('/pedidos', payload)
        toast.success('Pedido criado com sucesso!')
      }

      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar pedido')
    } finally {
      setSaving(false)
    }
  }

  // ── totais ─────────────────────────────────────────────────────────────────

  const total = form.itens.reduce((s, it) => s + itemSubtotal(it), 0)

  // ── cliente options ────────────────────────────────────────────────────────
  const clienteOpts = clientes.map((c) => ({
    value: String(c.id),
    label: c.nomeFantasia ? `${c.nomeFantasia} — ${c.nome}` : c.nome,
  }))

  const servicoOpts = [
    { value: '', label: 'Selecione o serviço…' },
    ...servicos.map((s) => ({ value: String(s.id), label: `${s.codigo} — ${s.nome}` })),
  ]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar pedido' : 'Novo pedido'}
      subtitle={
        isEdit
          ? `${pedido?.numero} — ${pedido?.clienteNomeFantasia ?? pedido?.clienteNome}`
          : 'Preencha os dados do pedido'
      }
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Cliente ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Cliente
          </h3>
          <Select
            label="Cliente *"
            value={form.clienteId}
            onChange={(e) => setField('clienteId', e.target.value)}
            options={[
              { value: '', label: 'Selecione o cliente…' },
              ...clienteOpts,
            ]}
          />
        </section>

        {/* ── Itens ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Serviços / Itens
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar serviço
            </button>
          </div>

          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-[1fr_60px_90px_72px_80px_28px] gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            <span>Serviço</span>
            <span className="text-center">Qtd</span>
            <span className="text-right">Preço unit.</span>
            <span className="text-right">Desc. %</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          {/* Linhas de item */}
          <div className="space-y-2">
            {form.itens.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_60px_90px_72px_80px_28px] gap-1.5 items-center"
              >
                {/* Serviço */}
                <select
                  value={item.servicoId}
                  onChange={(e) => handleServicoChange(i, e.target.value)}
                  className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[12px]
                    bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                >
                  {servicoOpts.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Quantidade */}
                <input
                  type="number"
                  min={1}
                  value={item.quantidade}
                  onChange={(e) => setItem(i, 'quantidade', e.target.value)}
                  className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[12px] text-center
                    bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />

                {/* Preço unitário */}
                <div className="relative">
                  {loadingPreco === i && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300">
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </span>
                  )}
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.preco}
                    onChange={(e) => setItem(i, 'preco', e.target.value)}
                    className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[12px] text-right
                      bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                      focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>

                {/* Desconto % */}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={item.desconto}
                  onChange={(e) => setItem(i, 'desconto', e.target.value)}
                  className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[12px] text-right
                    bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />

                {/* Subtotal */}
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 text-right tabular-nums">
                  {fmtBRL(itemSubtotal(item))}
                </span>

                {/* Remover */}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={form.itens.length === 1}
                  className="p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
            <span className="text-[12px] text-slate-500 dark:text-slate-400">
              {form.itens.length} {form.itens.length === 1 ? 'serviço' : 'serviços'}
            </span>
            <span className="text-[15px] font-semibold text-slate-900 dark:text-white tabular-nums">
              {fmtBRL(total)}
            </span>
          </div>
        </section>

        {/* ── Status (apenas edição) ── */}
        {isEdit && (
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Status
            </h3>
            <Select
              label="Status do pedido"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              options={STATUS_OPTS}
            />
          </section>
        )}

        {/* ── Observações ── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Observações
          </h3>
          <textarea
            value={form.observacoes}
            onChange={(e) => setField('observacoes', e.target.value)}
            rows={3}
            placeholder="Informações adicionais sobre o pedido…"
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px]
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              resize-none transition-colors"
          />
        </section>

        {/* ── Aviso preço sem cliente ── */}
        {!form.clienteId && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Selecione o cliente primeiro para carregar os preços da tabela personalizada.
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Salvar alterações' : 'Criar pedido'}
          </Button>
        </div>

      </form>
    </Drawer>
  )
}
