export type Endereco = {
  id: number
  tipo: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  principal: boolean
}

export type Cliente = {
  id: number
  tipo: string
  nome: string
  nomeFantasia?: string
  documentoMascarado: string
  inscricaoEstadual?: string
  idEtiqueta?: string
  email: string
  emailFinanceiro?: string
  emailMacroscopia?: string
  telefone?: string
  celular?: string
  segmento: string
  observacoes?: string
  ativo: boolean
  createdAt: string
  updatedAt: string
  enderecos: Endereco[]
}

export type ClienteListResponse = {
  data: Cliente[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
