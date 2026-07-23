export type Departamento = { key: string; label: string; ordem: number }

export type RastreioEtiqueta = {
  id: number
  codigo: string
  numero: number
  tipo: string
  coloracao?: string | null
  identificacao?: string | null
  departamentoAtual?: string | null
  rastreioStatus: string
  ultimoEventoEm?: string | null
  ultimoResponsavel?: string | null
  amostra: {
    id: number
    numeroInterno: string
    pedido: {
      id: number
      numero: string
      qtdPrevista?: number | null
      qtdRecebida?: number | null
      cliente: { id: number; nome: string; nomeFantasia?: string | null }
    }
  }
}

export type ScanResponse = {
  message: string
  evento: { id: number; departamento: string; tipo: string; createdAt: string }
  etiqueta: RastreioEtiqueta
}

export type Segmento = {
  departamento: string
  entrada: string | null
  saida: string | null
  duracaoMin: number | null
}

export type TimelineResponse = {
  etiqueta: RastreioEtiqueta & {
    eventos: { id: number; departamento: string; tipo: string; createdAt: string; scannedPor?: string | null }[]
  }
  segmentos: Segmento[]
}

export type ResumoResponse = {
  departamentos: (Departamento & { emProcesso: number })[]
  concluidas: number
  naoIniciadas: number
  total: number
}

export const STATUS_LABEL: Record<string, { label: string; variant: 'slate' | 'blue' | 'amber' | 'green' }> = {
  nao_iniciado: { label: 'Não iniciado', variant: 'slate' },
  em_andamento: { label: 'Em processo', variant: 'blue' },
  aguardando: { label: 'Aguardando', variant: 'amber' },
  concluido: { label: 'Concluído', variant: 'green' },
}
