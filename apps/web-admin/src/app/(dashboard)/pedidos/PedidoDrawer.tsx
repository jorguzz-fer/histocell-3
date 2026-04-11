'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, AlertCircle, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ServicoSearchInput } from '@/components/ui/ServicoSearchInput'
import { api } from '@/lib/api'
import type { Pedido, Servico, ClienteSimples } from './types'

// ─── tipos internos ───────────────────────────────────────────────────────────

type ItemForm = {
  servicoId: string
  servicoNome: string
  quantidade: string
  preco: string
  desconto: string
}

type FormState = {
  clienteId: string
  clienteSegmento: string
  observacoes: string
  status: string
  itens: ItemForm[]
}

const EMPTY_ITEM: ItemForm = {
  servicoId: '', servicoNome: '', quantidade: '1', preco: '', desconto: '0',
}

const EMPTY: FormState = {
  clienteId: '', clienteSegmento: 'recorrente', observacoes: '', status: 'rascunho',
  itens: [{ ...EMPTY_ITEM }],
}

const STATUS_OPTS = [
  { value: 'rascunho',  label: 'Rascunho' },
  { value: 'enviado',   label: 'Enviado' },
  { value: 'recebido',  label: 'Recebido' },
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
    clienteSegmento: 'recorrente',
    observacoes: p.observacoes ?? '',
    status: p.status,
    itens: p.itens.length > 0
      ? p.itens.map((i) => ({
          servicoId: String(i.servicoId),
          servicoNome: i.servico?.nome ?? '',
          quantidade: String(i.quantidade),
          preco: String(i.preco),
          desconto: String(i.desconto),
        }))
      : [{ ...EMPTY_ITEM }],
  }
}

// ─── NovoServicoModal ────────────────────────────────────────────────────────

interface NovoServicoModalProps {
  nomeInicial: string
  onClose: () => void
  onCriado: (servico: Servico) => void
}

function NovoServicoModal({ nomeInicial, onClose, onCriado }: NovoServicoModalProps) {
  const [nome, setNome]             = useState(nomeInicial)
  const [categoria, setCategoria]   = useState('Outros')
  const [precoRotina, setPrecoRotina]     = useState('')
  const [precoPesquisa, setPrecoPesquisa] = useState('')
  const [saving, setSaving]         = useState(false)

  const categorias = [
    'Macroscopia','Processamento','Criostato','Cortes Histológico','Cortes Eppendorf',
    'Colorações','Coloração Específica','Imunohistoquímica','Imunofluorescência',
    'Citologia','Análises','Laudos','Imagem','Outros',
    'Descarte/Devolução','IPOG','Insumos/Materiais','Anticorpo','Logística',
    'Consultoria/Serviços','Manutenção',
  ].map((v) => ({ value: v, label: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !precoRotina) { toast.error('Nome e preço rotina são obrigatórios.'); return }

    setSaving(true)
    try {
      const rot = parseFloat(precoRotina)
      const pes = parseFloat(precoPesquisa) || rot

      // Gera código único baseado em timestamp
      const codigo = `CUSTOM-${Date.now()}`
      const novo = await api.post<Servico>('/pedidos/servicos/novo', {
        codigo,
        categoria,
        nome: nome.trim(),
        precoBase: rot,
        precoRotina: rot,
        precoPesquisa: pes,
      })
      toast.success('Serviço criado com sucesso!')
      onCriado(novo)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao criar serviço')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Novo serviço</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome do serviço *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Coloração PAS" />

          <Select
            label="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            options={categorias}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço Rotina (R$) *"
              type="number" min="0" step="0.01"
              value={precoRotina}
              onChange={(e) => setPrecoRotina(e.target.value)}
              placeholder="0,00"
            />
            <Input
              label="Preço Pesquisa (R$)"
              type="number" min="0" step="0.01"
              value={precoPesquisa}
              onChange={(e) => setPrecoPesquisa(e.target.value)}
              placeholder="= rotina"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving}>Criar serviço</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PedidoDrawer ─────────────────────────────────────────────────────────────

interface PedidoDrawerProps {
  open: boolean
  onClose: () => void
  pedido: Pedido | null
  onSaved: () => void
}

export function PedidoDrawer({ open, onClose, pedido, onSaved }: PedidoDrawerProps) {
  const isEdit = Boolean(pedido)

  const [form, setForm]               = useState<FormState>(EMPTY)
  const [clientes, setClientes]       = useState<ClienteSimples[]>([])
  const [servicos, setServicos]       = useState<Servico[]>([])
  const [saving, setSaving]           = useState(false)
  const [loadingPreco, setLoadingPreco] = useState<number | null>(null)
  const [novoServicoNome, setNovoServicoNome] = useState<string | null>(null)

  const loadLists = useCallback(async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get<{ data: (ClienteSimples & { segmento: string })[] }>('/clientes?limit=200&ativo=true'),
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
      setNovoServicoNome(null)
      loadLists()
    }
  }, [open, pedido, loadLists])

  // ── helpers ──────────────────────────────────────────────────────────────────

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

  // Ao selecionar cliente, atualiza segmento
  function handleClienteChange(clienteId: string) {
    const c = (clientes as any[]).find((cl: any) => String(cl.id) === clienteId)
    setField('clienteId', clienteId)
    if (c) setField('clienteSegmento', c.segmento ?? 'recorrente')
  }

  // Ao selecionar serviço num item: busca preço
  async function handleServicoSelect(index: number, servicoId: string, servico: Servico | null) {
    setItem(index, 'servicoId', servicoId)
    setItem(index, 'servicoNome', servico?.nome ?? '')

    if (!servicoId || !form.clienteId) {
      if (servico) {
        const preco = form.clienteSegmento === 'pesquisador'
          ? servico.precoPesquisa
          : servico.precoRotina
        setItem(index, 'preco', String(preco || servico.precoBase))
      }
      return
    }

    setLoadingPreco(index)
    try {
      const res = await api.get<{ preco: number; desconto: number }>(
        `/pedidos/preco?clienteId=${form.clienteId}&servicoId=${servicoId}`,
      )
      setForm((f) => {
        const itens = [...f.itens]
        itens[index] = { ...itens[index], servicoId, servicoNome: servico?.nome ?? '', preco: String(res.preco), desconto: String(res.desconto) }
        return { ...f, itens }
      })
    } catch {
      if (servico) setItem(index, 'preco', String(servico.precoBase))
    } finally {
      setLoadingPreco(null)
    }
  }

  function handleServicoCriado(novoServico: Servico) {
    setServicos((prev) => [...prev, novoServico])
  }

  // ── validação ─────────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.clienteId) return 'Selecione um cliente.'
    if (form.itens.length === 0) return 'Adicione pelo menos um item.'
    for (let i = 0; i < form.itens.length; i++) {
      if (!form.itens[i].servicoId) return `Item ${i + 1}: selecione o serviço.`
      if (!parseInt(form.itens[i].quantidade) || parseInt(form.itens[i].quantidade) < 1)
        return `Item ${i + 1}: quantidade inválida.`
      if (form.itens[i].preco === '' || parseFloat(form.itens[i].preco) < 0)
        return `Item ${i + 1}: preço inválido.`
    }
    return null
  }

  // ── submit ───────────────────────────────────────────────────────────────────

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

  // ── totais ────────────────────────────────────────────────────────────────────

  const total = form.itens.reduce((s, it) => s + itemSubtotal(it), 0)
  const isPesquisador = form.clienteSegmento === 'pesquisador'

  const clienteOpts = [
    { value: '', label: 'Selecione o cliente…' },
    ...(clientes as any[]).map((c: any) => ({
      value: String(c.id),
      label: c.nomeFantasia ? `${c.nomeFantasia} — ${c.nome}` : c.nome,
    })),
  ]

  return (
    <>
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
              onChange={(e) => handleClienteChange(e.target.value)}
              options={clienteOpts}
            />
            {isPesquisador && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Cliente pesquisador — preços de pesquisa serão aplicados automaticamente.
              </p>
            )}
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
                className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700
                  dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar serviço
              </button>
            </div>

            <div className="space-y-4">
              {form.itens.map((item, i) => (
                <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2.5">

                  {/* Header do item */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Item {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={form.itens.length === 1}
                      className="p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50
                        dark:hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Picker de serviço */}
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Serviço *
                    </label>
                    <ServicoSearchInput
                      servicos={servicos}
                      value={item.servicoId}
                      onChange={(sid, s) => handleServicoSelect(i, sid, s)}
                      isPesquisador={isPesquisador}
                      onCriarNovo={(nome) => setNovoServicoNome(nome)}
                      disabled={!form.clienteId && servicos.length === 0}
                    />
                    {!form.clienteId && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Selecione o cliente primeiro para ver preços personalizados.
                      </p>
                    )}
                  </div>

                  {/* Qtd + Preço + Desconto + Subtotal */}
                  <div className="grid grid-cols-[80px_1fr_80px_auto] gap-2 items-end">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Qtd
                      </label>
                      <input
                        type="number" min={1}
                        value={item.quantidade}
                        onChange={(e) => setItem(i, 'quantidade', e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[13px] text-center
                          bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Preço unit. (R$)
                        {loadingPreco === i && (
                          <svg className="inline h-3 w-3 animate-spin text-blue-500 ml-1" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                      </label>
                      <input
                        type="number" min={0} step="0.01"
                        value={item.preco}
                        onChange={(e) => setItem(i, 'preco', e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[13px] text-right
                          bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Desc. %
                      </label>
                      <input
                        type="number" min={0} max={100} step="0.01"
                        value={item.desconto}
                        onChange={(e) => setItem(i, 'desconto', e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[13px] text-right
                          bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="text-right pb-1.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        Subtotal
                      </span>
                      <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {fmtBRL(itemSubtotal(item))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                {form.itens.length} {form.itens.length === 1 ? 'serviço' : 'serviços'}
              </span>
              <span className="text-[16px] font-semibold text-slate-900 dark:text-white tabular-nums">
                {fmtBRL(total)}
              </span>
            </div>
          </section>

          {/* ── Status (edição) ── */}
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
                focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
            />
          </section>

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

      {/* Modal de criar novo serviço */}
      {novoServicoNome !== null && (
        <NovoServicoModal
          nomeInicial={novoServicoNome}
          onClose={() => setNovoServicoNome(null)}
          onCriado={handleServicoCriado}
        />
      )}
    </>
  )
}
