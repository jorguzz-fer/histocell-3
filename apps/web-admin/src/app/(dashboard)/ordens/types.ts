export type EtapaOS = {
  id: number
  ordemServicoId: number
  etapa: string
  status: string
  responsavel?: string | null
  observacoes?: string | null
  iniciadoEm?: string | null
  concluidoEm?: string | null
}

export type OrdemServico = {
  id: number
  numero: string
  status: string
  etapaAtual: string
  prioridade: string
  responsavel?: string | null
  observacoes?: string | null
  iniciadoEm?: string | null
  concluidoEm?: string | null
  createdAt: string
  updatedAt: string
  etapas: EtapaOS[]
  amostra: {
    id: number
    numeroInterno: string
    numeroCliente?: string | null
    especie: string
    material: string
    localizacao?: string | null
    status: string
    dataRecebimento?: string | null
    pedido: {
      id: number
      numero: string
      cliente: { id: number; nome: string; nomeFantasia?: string | null }
    }
  }
}

export type OrdensListResponse = {
  data: OrdemServico[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type AmostraPendente = {
  id: number
  numeroInterno: string
  numeroCliente?: string | null
  especie: string
  material: string
  localizacao?: string | null
  dataRecebimento?: string | null
  pedido: {
    numero: string
    cliente: { id: number; nome: string; nomeFantasia?: string | null }
  }
}
