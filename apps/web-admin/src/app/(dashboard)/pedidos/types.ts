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
  codigoLegado?: number | null
  categoria: string
  nome: string
  precoBase: number
  precoRotina: number
  precoPesquisa: number
  tipo?:      string | null
  variante1?: string | null
  variante2?: string | null
  variante3?: string | null
  variante4?: string | null
  variante5?: string | null
}

export type ClienteSimples = {
  id: number
  nome: string
  nomeFantasia?: string | null
}
