/** Cliente como as duas origens de OS o entregam. */
export type ClienteFila = { id: number; nome: string; nomeFantasia?: string | null }

export type FilaOS = {
  id: number
  numero: string
  seq?: number | null
  etapaAtual: string
  prioridade: string
  responsavel?: string | null
  responsavelUserId?: number | null
  iniciadoEm?: string | null
  /** 'entrada' = aberta na recepção (sem amostra); 'amostra' = fluxo antigo. */
  origem?: string
  /** Preenchido quando a OS nasceu na Entrada. */
  cliente?: ClienteFila | null
  /** Contagem de volumes da entrada. */
  _count?: { volumes: number } | null
  /**
   * NULO na OS aberta pela Entrada: o material chegou, mas ainda não foi
   * identificado como amostra. Toda leitura precisa passar pelos helpers
   * abaixo — foi o acesso direto que derrubou a tela.
   */
  amostra: {
    id: number
    numeroInterno: string
    numeroCliente?: string | null
    especie: string
    material: string
    pedido: {
      id: number
      numero: string
      seq?: number | null
      cliente: ClienteFila
    }
  } | null
}

/** Cliente da OS, venha ela da Entrada ou do fluxo antigo (via amostra). */
export function clienteDaOS(os: FilaOS): ClienteFila | null {
  return os.cliente ?? os.amostra?.pedido.cliente ?? null
}

/** Nome de exibição do cliente, com fallback para OS sem dono identificado. */
export function nomeClienteDaOS(os: FilaOS): string {
  const c = clienteDaOS(os)
  return c ? (c.nomeFantasia || c.nome) : 'Cliente não identificado'
}

export type FilaPedidoPendente = {
  id: number
  numero: string
  seq?: number | null
  codigoCurto?: string
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
