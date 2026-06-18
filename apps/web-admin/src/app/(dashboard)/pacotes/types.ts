export type PacoteItem = {
  id: number
  servicoId: number
  quantidade: number
  preco: number
  subtotal: number
  servico: { id: number; codigo: string; nome: string; categoria: string }
}

export type Pacote = {
  id: number
  codigo: string
  nome: string
  descricao?: string | null
  ativo: boolean
  itens: PacoteItem[]
  precoTotal: number
  totalItens: number
  categorias?: string[]
  createdAt?: string
  updatedAt?: string
}
