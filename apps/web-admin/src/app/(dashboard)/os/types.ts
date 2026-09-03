export type VolumeOS = {
  id: number
  tipo: string
  condicao: string | null
  paciente: string | null
  codigo: string | null
  observacoes: string | null
}

export type ItemOS = {
  id: number
  servicoId: number
  quantidade: number
  preco: number
  desconto: number
  observacoes: string | null
  /** Condição a que o serviço se aplica: seco | molhado | macroscopia. */
  condicao: string | null
  /** Carimbo do encaminhamento à área técnica (fluxo do seco). */
  encaminhadoEm: string | null
  encaminhadoPor: string | null
  servico: { id: number; codigo: string; nome: string; categoria: string }
}

/** Quadro de uma condição na OS: volumes recebidos vs unidades lançadas. */
export type QuadroOS = {
  condicao: string
  volumes: number
  unidades: number
  completo: boolean
  encaminhados: number
  totalItens: number
}

/** Rótulo e cor de cada condição (mesma paleta da Entrada). */
export const CONDICAO_UI: Record<string, { label: string; badge: 'blue' | 'amber' | 'purple' }> = {
  molhado: { label: 'Molhado', badge: 'blue' },
  seco: { label: 'Seco', badge: 'amber' },
  macroscopia: { label: 'Macroscopia', badge: 'purple' },
}

export type OrdemServico = {
  id: number
  numero: string
  seq: number | null
  /** 'entrada' = aberta na recepção; 'amostra' = fluxo antigo, por amostra. */
  origem: string
  status: string
  etapaAtual: string
  prioridade: string
  responsavel: string | null
  observacoes: string | null
  createdAt: string
  cliente: { id: number; nome: string; nomeFantasia: string | null } | null
  amostra: {
    numeroInterno: string
    pedido: {
      id: number
      numero: string
      seq: number | null
      cliente: { id: number; nome: string; nomeFantasia: string | null }
    }
  } | null
  etapas: { id: number; etapa: string; status: string }[]
  volumes: VolumeOS[]
  itens: ItemOS[]
}

export type OrdemListResponse = {
  data: OrdemServico[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

/** Nome do cliente venha a OS da entrada ou do fluxo antigo. */
export function clienteDaOS(os: OrdemServico): string {
  const c = os.cliente ?? os.amostra?.pedido.cliente
  return c ? (c.nomeFantasia ?? c.nome) : '—'
}

export function clienteIdDaOS(os: OrdemServico): number | null {
  return os.cliente?.id ?? os.amostra?.pedido.cliente.id ?? null
}
