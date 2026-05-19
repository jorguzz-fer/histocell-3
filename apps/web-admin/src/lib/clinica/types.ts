import type { Servico } from '@/app/(dashboard)/pedidos/types'

// ─── shape do JSON de inteligência clínica ──────────────────────────────────

export interface RawPriced {
  codigo: string
  valorRotina: number
  valorPesquisa: number
}

export interface RawMarker {
  name: string
  cliente: RawPriced | null
  histocell: RawPriced | null
}

export interface RawPanel {
  nome: string
  icon: string
  descricao: string
  marcadores: { query: string; markerKey: string; nome: string }[]
  cobertura: string
}

export interface RawColoracao {
  nome: string
  codigo: string
  valorRotina: number
  valorPesquisa: number
}

export interface RawColoracaoGrupo {
  pergunta: string
  icon: string
  contexto: string
  'colorações': RawColoracao[]
}

export interface ClinicalIntelligenceJson {
  ihcMarkerIndex: Record<string, RawMarker>
  ihcPainelClinico: RawPanel[]
  coloracaoPorPerguntaClinica: RawColoracaoGrupo[]
}

// ─── tipos resolvidos contra o catálogo real ────────────────────────────────

export interface SuggestedServico {
  categoria: string
  precoRotina: number
  precoPesquisa: number
}

export interface ResolvedClinical {
  clinicalName: string
  codigo: string
  servico: Servico | null
  suggested: SuggestedServico
}

export interface IHCMarkerResolved {
  markerKey: string
  clinicalName: string
  histocell: ResolvedClinical | null
  cliente: ResolvedClinical | null
}

export interface IHCPanelResolved {
  nome: string
  descricao: string
  cobertura: string
  marcadores: IHCMarkerResolved[]
}

export interface ColoracaoGrupoResolved {
  pergunta: string
  contexto: string
  coloracoes: ResolvedClinical[]
}

export interface ClinicalIndex {
  ihcMarkers: IHCMarkerResolved[]
  ihcPaineis: IHCPanelResolved[]
  coloracaoGrupos: ColoracaoGrupoResolved[]
}
