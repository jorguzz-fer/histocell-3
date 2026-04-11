'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Flame, Star, Clock, GitBranch, Plus, Trash2,
  AlertCircle, ChevronDown, CheckCircle2, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { CascadingServicoSelector } from '@/components/ui/CascadingServicoSelector'
import { ServicoSearchInput } from '@/components/ui/ServicoSearchInput'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'

// ─── tipos ───────────────────────────────────────────────────────────────────

type Tab = 'populares' | 'favoritos' | 'historico' | 'guiado'

type ItemForm = {
  key:       string   // uid interno
  servicoId: number
  nome:      string
  categoria: string
  quantidade: number
  preco:     number
  desconto:  number
}

type ClienteOpt = {
  id: number
  nome: string
  nomeFantasia?: string | null
  segmento: string
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function itemSubtotal(item: ItemForm) {
  return item.preco * item.quantidade * (1 - item.desconto / 100)
}

// ─── ServicoCard (Populares / Favoritos / Histórico) ─────────────────────────

interface CardProps {
  servico: Servico & { totalUsos?: number; ultimoPedidoEm?: string; favoritado?: boolean }
  isPesquisador: boolean
  onAdd:    () => void
  onFav?:   () => void
  isFav?:   boolean
}

function ServicoCard({ servico, isPesquisador, onAdd, onFav, isFav }: CardProps) {
  const preco = isPesquisador ? servico.precoPesquisa : servico.precoRotina
  return (
    <div className="relative flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group">
      {/* Favorito */}
      {onFav && (
        <button
          onClick={(e) => { e.stopPropagation(); onFav() }}
          className={`absolute top-3 right-3 transition-colors ${isFav ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400'}`}
          title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Star className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
        </button>
      )}

      <div className="pr-6">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight line-clamp-2">
          {servico.nome}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{servico.categoria}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{fmtBRL(Number(preco))}</p>
          {servico.totalUsos != null && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{servico.totalUsos}× pedido</p>
          )}
          {servico.ultimoPedidoEm && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Último: {new Date(servico.ultimoPedidoEm).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PedidosGuiadoPage() {
  // ── estado geral ──────────────────────────────────────────────────────────
  const [clienteId, setClienteId]     = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus]           = useState<'rascunho' | 'enviado'>('rascunho')
  const [itens, setItens]             = useState<ItemForm[]>([])
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  // ── listas externas ───────────────────────────────────────────────────────
  const [clientes, setClientes]       = useState<ClienteOpt[]>([])
  const [populares, setPopulares]     = useState<(Servico & { totalUsos?: number })[]>([])
  const [favoritos, setFavoritos]     = useState<(Servico & { favoritado?: boolean })[]>([])
  const [historico, setHistorico]     = useState<(Servico & { ultimoPedidoEm?: string })[]>([])
  const [allServicos, setAllServicos] = useState<Servico[]>([])

  // ── tab + UI ──────────────────────────────────────────────────────────────
  const [tab, setTab]                 = useState<Tab>('populares')
  const [favIds, setFavIds]           = useState<Set<number>>(new Set())
  const [userId, setUserId]           = useState<number | null>(null)

  // ── cliente selecionado ───────────────────────────────────────────────────
  const cliente = clientes.find((c) => String(c.id) === clienteId)
  const isPesquisador = cliente?.segmento === 'pesquisador'
  const priceKey = isPesquisador ? 'precoPesquisa' : 'precoRotina'

  // ── carregamento inicial ──────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('user')
    if (raw) {
      try { setUserId(JSON.parse(raw)?.id ?? null) } catch {}
    }

    Promise.all([
      api.get<{ data: ClienteOpt[] }>('/clientes?limit=500&ativo=true'),
      api.get<(Servico & { totalUsos?: number })[]>('/pedidos/servicos/populares'),
      api.get<Servico[]>('/pedidos/servicos'),
    ]).then(([cRes, pop, all]) => {
      setClientes(cRes.data)
      setPopulares(pop)
      setAllServicos(all)
    }).catch(() => toast.error('Erro ao carregar dados'))

    // Favoritos (precisa de userId)
    api.get<Servico[]>('/pedidos/servicos/favoritos')
      .then((favs) => {
        setFavoritos(favs)
        setFavIds(new Set(favs.map((f) => f.id)))
      })
      .catch(() => {})
  }, [])

  // ── histórico do cliente quando muda ─────────────────────────────────────
  useEffect(() => {
    if (!clienteId) { setHistorico([]); return }
    api.get<(Servico & { ultimoPedidoEm?: string })[]>(
      `/pedidos/clientes/${clienteId}/historico-servicos`
    ).then(setHistorico).catch(() => {})
  }, [clienteId])

  // ── adicionar item ────────────────────────────────────────────────────────
  const addServico = useCallback(async (s: Servico) => {
    // Busca preço correto se tiver cliente
    let preco = Number(s[priceKey as keyof Servico] ?? s.precoRotina)
    let desconto = 0

    if (clienteId) {
      try {
        const res = await api.get<{ preco: number; desconto: number }>(
          `/pedidos/preco?clienteId=${clienteId}&servicoId=${s.id}`
        )
        preco    = res.preco
        desconto = res.desconto ?? 0
      } catch {}
    }

    setItens((prev) => [
      ...prev,
      {
        key:       `${s.id}-${Date.now()}`,
        servicoId: s.id,
        nome:      s.nome,
        categoria: s.categoria,
        quantidade: 1,
        preco,
        desconto,
      },
    ])
    toast.success(`"${s.nome}" adicionado`)
  }, [clienteId, priceKey])

  function removeItem(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key))
  }

  function updateItem(key: string, field: 'quantidade' | 'preco' | 'desconto', value: number) {
    setItens((prev) =>
      prev.map((i) => i.key === key ? { ...i, [field]: value } : i)
    )
  }

  // ── toggle favorito ───────────────────────────────────────────────────────
  async function toggleFav(s: Servico) {
    try {
      const res = await api.post<{ favoritado: boolean }>(`/pedidos/servicos/${s.id}/favorito`, {})
      setFavIds((prev) => {
        const next = new Set(prev)
        if (res.favoritado) {
          next.add(s.id)
          setFavoritos((f) => [s, ...f.filter((x) => x.id !== s.id)])
        } else {
          next.delete(s.id)
          setFavoritos((f) => f.filter((x) => x.id !== s.id))
        }
        return next
      })
      toast.success(res.favoritado ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
    } catch {
      toast.error('Erro ao atualizar favorito')
    }
  }

  // ── salvar ────────────────────────────────────────────────────────────────
  async function handleSalvar(finalStatus: 'rascunho' | 'enviado') {
    if (!clienteId) { toast.error('Selecione um cliente.'); return }
    if (itens.length === 0) { toast.error('Adicione pelo menos um serviço.'); return }

    setSaving(true)
    try {
      await api.post('/pedidos', {
        clienteId: parseInt(clienteId),
        observacoes: observacoes || undefined,
        status: finalStatus,
        itens: itens.map((i) => ({
          servicoId:  i.servicoId,
          quantidade: i.quantidade,
          preco:      i.preco,
          desconto:   i.desconto,
        })),
      })
      setSaved(true)
      toast.success(finalStatus === 'enviado' ? 'Pedido enviado!' : 'Rascunho salvo!')
      setTimeout(() => {
        setItens([])
        setClienteId('')
        setObservacoes('')
        setSaved(false)
      }, 2000)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar pedido')
    } finally {
      setSaving(false)
    }
  }

  const totalGeral = itens.reduce((sum, i) => sum + itemSubtotal(i), 0)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pedido Guiado</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Selecione serviços passo a passo ou por favoritos/histórico
          </p>
        </div>
        {isPesquisador && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Preço Pesquisa</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
        {/* ── Coluna esquerda: seleção de serviços ────────────────────────── */}
        <div className="space-y-5">
          {/* Cliente */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cliente</h2>
            <Select
              label=""
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              options={[
                { value: '', label: 'Selecione o cliente…' },
                ...clientes.map((c) => ({
                  value: String(c.id),
                  label: c.nomeFantasia ? `${c.nomeFantasia} — ${c.nome}` : c.nome,
                })),
              ]}
            />
            {cliente && (
              <div className="flex items-center gap-2">
                <Badge variant={isPesquisador ? 'warning' : 'default'}>
                  {isPesquisador ? 'Pesquisador' : cliente.segmento}
                </Badge>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Preços em {isPesquisador ? 'pesquisa' : 'rotina'}
                </span>
              </div>
            )}
          </div>

          {/* Tabs de serviços */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              {(
                [
                  { key: 'populares', label: 'Populares', icon: Flame },
                  { key: 'favoritos', label: 'Favoritos', icon: Star },
                  { key: 'historico', label: 'Histórico',  icon: Clock },
                  { key: 'guiado',   label: 'Guiado',     icon: GitBranch },
                ] as { key: Tab; label: string; icon: React.ElementType }[]
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-all border-b-2 ${
                    tab === key
                      ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {key === 'favoritos' && favIds.size > 0 && (
                    <span className="ml-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {favIds.size}
                    </span>
                  )}
                  {key === 'historico' && historico.length > 0 && (
                    <span className="ml-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {historico.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div className="p-5">
              {/* Populares */}
              {tab === 'populares' && (
                <div>
                  {populares.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                      Ainda não há pedidos registrados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {populares.map((s) => (
                        <ServicoCard
                          key={s.id}
                          servico={s}
                          isPesquisador={isPesquisador}
                          onAdd={() => addServico(s)}
                          onFav={() => toggleFav(s)}
                          isFav={favIds.has(s.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Favoritos */}
              {tab === 'favoritos' && (
                <div>
                  {favoritos.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <Star className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Nenhum favorito ainda.
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Clique na ★ em qualquer serviço para favoritar.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {favoritos.map((s) => (
                        <ServicoCard
                          key={s.id}
                          servico={s}
                          isPesquisador={isPesquisador}
                          onAdd={() => addServico(s)}
                          onFav={() => toggleFav(s)}
                          isFav={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Histórico do cliente */}
              {tab === 'historico' && (
                <div>
                  {!clienteId ? (
                    <div className="text-center py-8 space-y-2">
                      <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Selecione um cliente para ver o histórico.
                      </p>
                    </div>
                  ) : historico.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                      Esse cliente ainda não tem pedidos anteriores.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                        Serviços que {cliente?.nomeFantasia ?? cliente?.nome} já pediu:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {historico.map((s) => (
                          <ServicoCard
                            key={s.id}
                            servico={s}
                            isPesquisador={isPesquisador}
                            onAdd={() => addServico(s)}
                            onFav={() => toggleFav(s)}
                            isFav={favIds.has(s.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Seleção Guiada */}
              {tab === 'guiado' && (
                <CascadingServicoSelector
                  isPesquisador={isPesquisador}
                  onSelect={addServico}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Coluna direita: resumo do pedido ──────────────────────────────── */}
        <div className="sticky top-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Itens do Pedido
              </h2>
              {itens.length > 0 && (
                <Badge variant="default">{itens.length} item{itens.length !== 1 ? 's' : ''}</Badge>
              )}
            </div>

            {itens.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <ChevronDown className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Adicione serviços à esquerda
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
                {itens.map((item) => (
                  <div key={item.key} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
                          {item.nome}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.categoria}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">Qtd</label>
                        <input
                          type="number" min="1" step="1"
                          value={item.quantidade}
                          onChange={(e) => updateItem(item.key, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">Preço (R$)</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.preco}
                          onChange={(e) => updateItem(item.key, 'preco', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">Desc.%</label>
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={item.desconto}
                          onChange={(e) => updateItem(item.key, 'desconto', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="text-right text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                      {fmtBRL(itemSubtotal(item))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total + obs + ações */}
            {itens.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <textarea
                  placeholder="Observações (opcional)…"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400"
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Total</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{fmtBRL(totalGeral)}</span>
                </div>

                {saved ? (
                  <div className="flex items-center gap-2 justify-center py-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Salvo com sucesso!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => handleSalvar('enviado')}
                      loading={saving}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Pedido
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleSalvar('rascunho')}
                      loading={saving}
                    >
                      Salvar como Rascunho
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
