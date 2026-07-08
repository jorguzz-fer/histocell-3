export type FilaOS = {
  id: number
  numero: string
  etapaAtual: string
  prioridade: string
  responsavel?: string | null
  responsavelUserId?: number | null
  iniciadoEm?: string | null
  amostra: {
    id: number
    numeroInterno: string
    numeroCliente?: string | null
    especie: string
    material: string
    pedido: {
      numero: string
      cliente: { id: number; nome: string; nomeFantasia?: string | null }
    }
  }
}

export type FilaPedidoPendente = {
  id: number
  numero: string
  clienteNome: string
  totalOrcado: number
  totalRecebido: number
  dataRecebimento?: string | null
}

export type FilaResponse = {
  etapas: string[]
  counts: Record<string, number> & { aprovacaoDivergencia: number }
  secoes: Record<string, FilaOS[]> & { aprovacaoDivergencia: FilaPedidoPendente[] }
}
