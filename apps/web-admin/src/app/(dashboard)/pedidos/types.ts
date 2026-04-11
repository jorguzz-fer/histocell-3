export type ItemPedido = {
  id: number
  servicoId: number
  servico: {
    id: number
    codigo: string
    nome: string
    precoBase: number
  }
  quantidade: number
  preco: number
  desconto: number
  subtotal: number
}

export type Pedido = {
  id: number
  numero: string
  clienteId: number
  clienteNome: string
  clienteNomeFantasia?: string | null
  status: string
  dataEnvio?: string | null
  dataRecebimento?: string | null
  observacoes?: string | null
  itens: ItemPedido[]
  totalItens: number
  valorTotal: number
  createdAt: string
  updatedAt: string
}

export type PedidoListResponse = {
  data: Pedido[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type Servico = {
  id: number
  codigo: string
  nome: string
  precoBase: number
}

export type ClienteSimples = {
  id: number
  nome: string
  nomeFantasia?: string | null
}
