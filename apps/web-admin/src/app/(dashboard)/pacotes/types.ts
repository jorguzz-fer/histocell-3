export type PacoteItem = {
  id: number
  servicoId: number
  quantidade: number
  preco: number
  descontoPct: number
  precoTabela: number   // preço de rotina do serviço (referência)
  precoEfetivo: number  // preço unitário efetivo (fixo, ou tabela−desconto)
  subtotal: number
  servico: { id: number; codigo: string; nome: string; categoria: string; precoRotina?: number; precoPesquisa?: number }
}

export type Pacote = {
  id: number
  codigo: string
  nome: string
  descricao?: string | null
  tipoPreco: 'fixo' | 'desconto'
  ativo: boolean
  itens: PacoteItem[]
  precoTotal: number
  precoEstimado?: boolean // no modo 'desconto', o total é "a partir de"
  totalItens: number
  categorias?: string[]
  createdAt?: string
  updatedAt?: string
}
