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

export type DraftPedido = {
  id: number
  numero: string
  clienteNome: string
  clienteNomeFantasia?: string | null
  totalItens: number
  valorTotal: number
  urgente?: boolean
  createdAt: string
}

export type OrderCartItem = {
  key: string
  servicoId: number
  nome: string
  categoria: string
  quantidade: number
  preco: number
  desconto: number          // valor digitado — interpretado conforme descontoTipo
  descontoTipo: DescontoTipo // 'pct' = percentual | 'valor' = R$ abatidos do total do item
  prazoDias: number          // prazo (dias) do serviço — usado para o prazo do orçamento
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
  const [pedidoCriado, setPedidoCriado] = useState<{ id: number; numero: string } | null>(null)
  const [prazoDias, setPrazoDiasState]    = useState(1)
  const [prazoManual, setPrazoManual]     = useState(false) // true quando o usuário editou o prazo à mão
  const [urgente, setUrgente]             = useState(false)
  const [pagamentoAdiantado, setPagamentoAdiantado] = useState(false)
  const [creditoSaldo, setCreditoSaldo]   = useState<number | null>(null)
  const [rascunhos, setRascunhos]         = useState<DraftPedido[]>([])
  const [editId, setEditId]               = useState<number | null>(null)

  const carregarRascunhos = useCallback(() => {
    api.get<{ data: DraftPedido[] }>('/pedidos?status=rascunho&limit=50')
      .then((res) => setRascunhos(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => { carregarRascunhos() }, [carregarRascunhos])

  useEffect(() => {
    api.get<{ data: ClienteOpt[] }>('/clientes?limit=500&ativo=true')
      .then((res) => setClientes(res.data))
      .catch(() => toast.error('Erro ao carregar clientes'))
  }, [])

  // saldo de crédito pré-pago do cliente selecionado
  useEffect(() => {
    if (!clienteId) { setCreditoSaldo(null); return }
    api.get<{ saldo: number }>(`/financeiro/creditos/${clienteId}/saldo`)
      .then((r) => setCreditoSaldo(r.saldo))
      .catch(() => setCreditoSaldo(null))
  }, [clienteId])

  const cliente = clientes.find((c) => String(c.id) === clienteId)
  const isPesquisador = cliente?.segmento === 'pesquisador'
  const priceKey = isPesquisador ? 'precoPesquisa' : 'precoRotina'

  // Edição manual do prazo pelo usuário (fixa o valor; para de seguir os itens).
  const setPrazoDias = useCallback((v: number) => { setPrazoManual(true); setPrazoDiasState(v) }, [])

  // Prazo do orçamento = maior prazo entre os itens — recalcula ao adicionar/remover
  // (enquanto o usuário não editar à mão). Sem itens volta a 1.
  useEffect(() => {
    if (prazoManual) return
    const maior = itens.reduce((m, i) => Math.max(m, Number(i.prazoDias) || 1), 1)
    setPrazoDiasState(maior)
  }, [itens, prazoManual])

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
      { key: `${s.id}-${Date.now()}`, servicoId: s.id, nome: s.nome, categoria: s.categoria, quantidade: 1, preco, desconto, descontoTipo: 'pct', prazoDias: Number(s.prazoDias ?? 1) || 1 },
    ])
    // o prazo do orçamento é recalculado pelo efeito (maior prazo entre os itens)
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
        prazoDias: 1,
      },
    ])
  }, [])

  /** Adiciona um pacote inteiro, explodindo nos serviços-componentes.
   *  - tipoPreco 'fixo'     → usa o preço fechado do componente.
   *  - tipoPreco 'desconto' → usa o preço ATUAL do cliente e aplica o % do pacote. */
  const addPacote = useCallback(async (p: {
    nome: string
    tipoPreco?: 'fixo' | 'desconto'
    itens: {
      servicoId: number; quantidade: number; preco: number; descontoPct?: number
      servico: { nome: string; categoria: string; precoRotina?: number }
    }[]
  }) => {
    const desconto = p.tipoPreco === 'desconto'
    for (const it of p.itens) {
      let preco = Number(it.preco)
      if (desconto) {
        // preço-base = tabela do cliente (cai na rotina do serviço se não houver cliente)
        let base = Number(it.servico.precoRotina ?? 0)
        if (clienteId) {
          try {
            const res = await api.get<{ preco: number }>(
              `/pedidos/preco?clienteId=${clienteId}&servicoId=${it.servicoId}`,
            )
            base = res.preco
          } catch {}
        }
        preco = Math.round(base * (1 - Number(it.descontoPct ?? 0) / 100) * 100) / 100
      }
      addItemDireto({
        servicoId: it.servicoId,
        nome: it.servico.nome,
        categoria: it.servico.categoria,
        preco,
        quantidade: it.quantidade,
      })
    }
    toast.success(`Pacote "${p.nome}" adicionado (${p.itens.length} ${p.itens.length === 1 ? 'serviço' : 'serviços'})`)
  }, [addItemDireto, clienteId])

  function updateItem(
    key: string,
    field: 'quantidade' | 'preco' | 'desconto' | 'descontoTipo',
    value: number | DescontoTipo,
  ) {
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)))
  }

  const limpar = useCallback(() => {
    setItens([]); setClienteId(''); setObservacoes(''); setUrgente(false); setPagamentoAdiantado(false)
    setPrazoDiasState(1); setPrazoManual(false); setEditId(null)
  }, [])

  // Carrega um rascunho de volta no carrinho para continuar editando.
  const continuarRascunho = useCallback(async (id: number) => {
    try {
      const p = await api.get<any>(`/pedidos/${id}`)
      setEditId(p.id)
      setClienteId(String(p.cliente?.id ?? p.clienteId ?? ''))
      setObservacoes(p.observacoes ?? '')
      setPrazoDiasState(Number(p.prazoDias ?? 1) || 1)
      setPrazoManual(true) // respeita o prazo salvo do rascunho
      setUrgente(Boolean(p.urgente))
      setPagamentoAdiantado(Boolean(p.pagamentoAdiantado))
      setItens(
        (p.itens ?? []).map((it: any) => ({
          key: `${it.servicoId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          servicoId: it.servicoId,
          nome: it.servico?.nome ?? '',
          categoria: it.servico?.categoria ?? '',
          quantidade: it.quantidade,
          preco: Number(it.preco),
          desconto: Number(it.desconto ?? 0),
          descontoTipo: 'pct' as DescontoTipo,
          prazoDias: Number(it.servico?.prazoDias ?? 1) || 1,
        })),
      )
      toast.success(`Rascunho ${p.numero} carregado`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar rascunho')
    }
  }, [])

  const excluirRascunho = useCallback(async (id: number) => {
    try {
      await api.delete(`/pedidos/${id}`)
      if (editId === id) limpar()
      toast.success('Rascunho excluído')
      carregarRascunhos()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir rascunho')
    }
  }, [editId, limpar, carregarRascunhos])

  async function handleSalvar(finalStatus: 'rascunho' | 'enviado') {
    if (!clienteId) { toast.error('Selecione um cliente.'); return }
    if (itens.length === 0) { toast.error('Adicione pelo menos um serviço.'); return }
    setSaving(true)
    try {
      const body = {
        clienteId: parseInt(clienteId),
        observacoes: observacoes || undefined,
        urgente,
        pagamentoAdiantado,
        prazoDias,
        status: finalStatus,
        itens: itens.map((i) => ({ servicoId: i.servicoId, quantidade: i.quantidade, preco: i.preco, desconto: descontoComoPct(i) })),
      }
      // Editando um rascunho existente → atualiza; senão cria novo.
      const pedido = editId
        ? await api.patch<{ id: number; numero: string }>(`/pedidos/${editId}`, body)
        : await api.post<{ id: number; numero: string }>('/pedidos', body)
      toast.success(finalStatus === 'enviado' ? 'Pedido gerado!' : 'Rascunho salvo!')
      if (finalStatus === 'enviado') {
        // limpa o carrinho e mostra o painel de "Pedido gerado" com ação de etiquetas
        setPedidoCriado({ id: pedido.id, numero: pedido.numero })
        limpar()
      } else {
        setSaved(true)
        setTimeout(() => { limpar(); setSaved(false) }, 2000)
      }
      carregarRascunhos()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar pedido')
    } finally {
      setSaving(false)
    }
  }

  function limparPedidoCriado() {
    setPedidoCriado(null)
  }

  const totalGeral = itens.reduce((sum, i) => sum + itemSubtotal(i), 0)

  return {
    clienteId, setClienteId, observacoes, setObservacoes, itens, saving, saved, clientes,
    cliente, isPesquisador, totalGeral, pedidoCriado, limparPedidoCriado,
    urgente, setUrgente, pagamentoAdiantado, setPagamentoAdiantado, creditoSaldo,
    prazoDias, setPrazoDias,
    addServico, addItemDireto, addPacote, removeItem, updateItem, handleSalvar,
    rascunhos, editId, continuarRascunho, excluirRascunho,
  }
}
