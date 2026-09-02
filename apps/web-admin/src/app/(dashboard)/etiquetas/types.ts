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

export type EtiquetaOS = {
  id: number
  numero: string
  seq?: number | null
  cliente: { id: number; nome: string; nomeFantasia?: string | null } | null
}

export type Etiqueta = {
  id: number
  /** NULO na etiqueta de cassete gerada direto na OS (fluxo da Entrada). */
  amostraId: number | null
  numero: number
  codigo: string
  tipo: TipoEtiqueta
  coloracao?: string | null
  identificacao?: string | null
  laminaSeq: number
  impresso: boolean
  impressoEm?: string | null
  createdAt: string
  amostra: EtiquetaAmostra | null
  ordemServico?: EtiquetaOS | null
}

/** Cliente da etiqueta, venha ela da amostra (pedido) ou direto da OS. */
export function clienteDaEtiqueta(e: Etiqueta) {
  return e.amostra?.pedido.cliente ?? e.ordemServico?.cliente ?? null
}

/** Referência interna impressa na etiqueta: nº Histocell ou o código curto da OS. */
export function refDaEtiqueta(e: Etiqueta): string {
  if (e.amostra) return e.amostra.numeroInterno
  const os = e.ordemServico
  if (!os) return '—'
  return os.seq != null ? `OS #${String(os.seq).padStart(4, '0')}` : os.numero
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
  geraEtiqueta?: boolean
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
