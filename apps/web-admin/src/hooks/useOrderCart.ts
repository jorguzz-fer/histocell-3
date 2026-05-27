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

export type OrderCartItem = {
  key: string
  servicoId: number
  nome: string
  categoria: string
  quantidade: number
  preco: number
  desconto: number
}

export function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function itemSubtotal(item: OrderCartItem) {
  return item.preco * item.quantidade * (1 - item.desconto / 100)
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
      { key: `${s.id}-${Date.now()}`, servicoId: s.id, nome: s.nome, categoria: s.categoria, quantidade: 1, preco, desconto },
    ])
    toast.success(`"${s.nome}" adicionado`)
  }, [clienteId, priceKey])

  function removeItem(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key))
  }

  function updateItem(key: string, field: 'quantidade' | 'preco' | 'desconto', value: number) {
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
        itens: itens.map((i) => ({ servicoId: i.servicoId, quantidade: i.quantidade, preco: i.preco, desconto: i.desconto })),
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
    addServico, removeItem, updateItem, handleSalvar,
  }
}
