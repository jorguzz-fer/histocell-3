'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'

export type ClienteOpt = {
  id: number
  nome: string
  nomeFantasia?: string | null
  segmento: string
}

export type DescontoTipo = 'pct' | 'valor'

export type OrderCartItem = {
  key: string
  servicoId: number
  nome: string
  categoria: string
  quantidade: number
  preco: number
  desconto: number          // valor digitado — interpretado conforme descontoTipo
  descontoTipo: DescontoTipo // 'pct' = percentual | 'valor' = R$ abatidos do total do item
}

export function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function itemSubtotal(item: OrderCartItem) {
  const bruto = item.preco * item.quantidade
  if (item.descontoTipo === 'valor') return Math.max(0, bruto - item.desconto)
  return bruto * (1 - item.desconto / 100)
}

/** Converte o desconto do item para percentual (contrato do backend, que armazena %) */
export function descontoComoPct(item: OrderCartItem): number {
  if (item.descontoTipo !== 'valor') {
    return Math.min(100, Math.max(0, item.desconto))
  }
  const bruto = item.preco * item.quantidade
  if (bruto <= 0) return 0
  const pct = (item.desconto / bruto) * 100
  return Math.min(100, Math.max(0, Math.round(pct * 100) / 100))
}

export function useOrderCart() {
  const [clienteId, setClienteId]     = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens]             = useState<OrderCartItem[]>([])
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [clientes, setClientes]       = useState<ClienteOpt[]>([])

  useEffect(() => {
    api.get<{ data: ClienteOpt[] }>('/clientes?limit=500&ativo=true')
      .then((res) => setClientes(res.data))
      .catch(() => toast.error('Erro ao carregar clientes'))
  }, [])

  const cliente = clientes.find((c) => String(c.id) === clienteId)
  const isPesquisador = cliente?.segmento === 'pesquisador'
  const priceKey = isPesquisador ? 'precoPesquisa' : 'precoRotina'

  const addServico = useCallback(async (s: Servico) => {
    let preco = Number(s[priceKey as keyof Servico] ?? s.precoRotina)
    let desconto = 0
    if (clienteId) {
      try {
        const res = await api.get<{ preco: number; desconto: number }>(
          `/pedidos/preco?clienteId=${clienteId}&servicoId=${s.id}`,
        )
        preco = res.preco
        desconto = res.desconto ?? 0
      } catch {}
    }
    setItens((prev) => [
      ...prev,
      { key: `${s.id}-${Date.now()}`, servicoId: s.id, nome: s.nome, categoria: s.categoria, quantidade: 1, preco, desconto, descontoTipo: 'pct' },
    ])
    toast.success(`"${s.nome}" adicionado`)
  }, [clienteId, priceKey])

  function removeItem(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key))
  }

  /** Adiciona um item com preço/quantidade explícitos, sem buscar preço por cliente.
   *  Usado por pacotes, que carregam o preço definido em cada componente. */
  const addItemDireto = useCallback((args: {
    servicoId: number; nome: string; categoria: string; preco: number; quantidade?: number
  }) => {
    setItens((prev) => [
      ...prev,
      {
        key: `${args.servicoId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        servicoId: args.servicoId,
        nome: args.nome,
        categoria: args.categoria,
        quantidade: args.quantidade ?? 1,
        preco: args.preco,
        desconto: 0,
        descontoTipo: 'pct',
      },
    ])
  }, [])

  function updateItem(
    key: string,
    field: 'quantidade' | 'preco' | 'desconto' | 'descontoTipo',
    value: number | DescontoTipo,
  ) {
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)))
  }

  async function handleSalvar(finalStatus: 'rascunho' | 'enviado') {
    if (!clienteId) { toast.error('Selecione um cliente.'); return }
    if (itens.length === 0) { toast.error('Adicione pelo menos um serviço.'); return }
    setSaving(true)
    try {
      await api.post('/pedidos', {
        clienteId: parseInt(clienteId),
        observacoes: observacoes || undefined,
        status: finalStatus,
        itens: itens.map((i) => ({ servicoId: i.servicoId, quantidade: i.quantidade, preco: i.preco, desconto: descontoComoPct(i) })),
      })
      setSaved(true)
      toast.success(finalStatus === 'enviado' ? 'Pedido enviado!' : 'Rascunho salvo!')
      setTimeout(() => { setItens([]); setClienteId(''); setObservacoes(''); setSaved(false) }, 2000)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar pedido')
    } finally {
      setSaving(false)
    }
  }

  const totalGeral = itens.reduce((sum, i) => sum + itemSubtotal(i), 0)

  return {
    clienteId, setClienteId, observacoes, setObservacoes, itens, saving, saved, clientes,
    cliente, isPesquisador, totalGeral,
    addServico, addItemDireto, removeItem, updateItem, handleSalvar,
  }
}
