export type PedidoFila = {
  id: number
  numero: string
  clienteId: number
  clienteNome: string
  clienteNomeFantasia?: string | null
  status: string
  origem?: string
  urgente?: boolean
  pagamentoAdiantado?: boolean
  dataEnvio?: string | null
  observacoes?: string | null
  itens: {
    id: number
    servicoId: number
    quantidade: number
    preco: number
    desconto: number
    servico: { nome: string; codigo: string }
  }[]
  amostras: { id: number; status: string }[]
  recipientes?: { id: number; tipo: string; quantidade: number; codigo?: string | null }[]
  totalAmostras: number
  createdAt: string
}

export type Amostra = {
  id: number
  pedidoId: number
  numeroInterno: string
  numeroCliente?: string | null
  especie: string
  material: string
  localizacao?: string | null
  status: string
  observacoes?: string | null
  dataRecebimento?: string | null
  recebidoPor?: string | null
  createdAt: string
  updatedAt: string
  pedido: {
    id: number
    numero: string
    cliente: { id: number; nome: string; nomeFantasia?: string | null }
  }
}

export type AmostraListResponse = {
  data: Amostra[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type AmostraItemForm = {
  recipienteId?: number | null
  servicoId?: number | null
  numeroCliente: string
  especie: string
  material: string
  localizacao: string
  observacoes: string
}
