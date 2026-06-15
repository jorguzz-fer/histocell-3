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
