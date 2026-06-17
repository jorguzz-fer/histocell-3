export type TipoEtiqueta = 'cassete' | 'lamina' | 'bloco'

export type EtiquetaAmostra = {
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

export type Etiqueta = {
  id: number
  amostraId: number
  numero: number
  codigo: string
  tipo: TipoEtiqueta
  coloracao?: string | null
  identificacao?: string | null
  laminaSeq: number
  impresso: boolean
  impressoEm?: string | null
  createdAt: string
  amostra: EtiquetaAmostra
}

export type EtiquetaListResponse = {
  data: Etiqueta[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

/** Linha editável da conferência de etiquetas de um pedido. */
export type LinhaConferencia = {
  amostraId: number
  numeroInterno: string
  itemPedidoId: number
  servicoNome: string
  servicoCodigo: string
  quantidadeItem: number
  jaGeradas: number
  tipo: TipoEtiqueta
  quantidade: number
  coloracao: string
  identificacao: string
}

export type PrepararPedidoResponse = {
  pedido: { id: number; numero: string; clienteNome: string }
  linhas: LinhaConferencia[]
}

export type GerarLoteResponse = {
  message: string
  etiquetas: Etiqueta[]
}

export type AmostraComContagem = {
  id: number
  numeroInterno: string
  numeroCliente?: string | null
  especie: string
  material: string
  pedido: {
    numero: string
    cliente: { id: number; nome: string; nomeFantasia?: string | null }
  }
  totalEtiquetas: number
  etiquetasImpressas: number
}
