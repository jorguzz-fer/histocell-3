import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type {
  ClinicalIntelligenceJson, ClinicalIndex, ResolvedClinical, SuggestedServico,
  IHCMarkerResolved, IHCPanelResolved, ColoracaoGrupoResolved,
} from './types'

export interface CatalogIndex {
  byCodigo: Map<string, Servico>
  byLegado: Map<number, Servico>
}

export function indexCatalog(servicos: Servico[]): CatalogIndex {
  const byCodigo = new Map<string, Servico>()
  const byLegado = new Map<number, Servico>()
  for (const s of servicos) {
    byCodigo.set(s.codigo, s)
    if (s.codigoLegado != null) byLegado.set(s.codigoLegado, s)
  }
  return { byCodigo, byLegado }
}

function lookup(codigo: string, idx: CatalogIndex): Servico | null {
  const direct = idx.byCodigo.get(codigo)
  if (direct) return direct
  const asNum = parseInt(codigo, 10)
  if (!Number.isNaN(asNum)) {
    const legado = idx.byLegado.get(asNum)
    if (legado) return legado
  }
  return null
}

export function resolveOne(
  clinicalName: string,
  codigo: string,
  suggested: SuggestedServico,
  idx: CatalogIndex,
): ResolvedClinical {
  return { clinicalName, codigo, servico: lookup(codigo, idx), suggested }
}

export function buildClinicalIndex(
  servicos: Servico[],
  ci: ClinicalIntelligenceJson,
): ClinicalIndex {
  const idx = indexCatalog(servicos)

  const ihcMarkers: IHCMarkerResolved[] = Object.entries(ci.ihcMarkerIndex).map(
    ([markerKey, raw]) => ({
      markerKey,
      clinicalName: raw.name,
      histocell: raw.histocell
        ? resolveOne(raw.name, raw.histocell.codigo,
            { categoria: 'Imunohistoquímica', precoRotina: raw.histocell.valorRotina, precoPesquisa: raw.histocell.valorPesquisa }, idx)
        : null,
      cliente: raw.cliente
        ? resolveOne(raw.name, raw.cliente.codigo,
            { categoria: 'Imunohistoquímica', precoRotina: raw.cliente.valorRotina, precoPesquisa: raw.cliente.valorPesquisa }, idx)
        : null,
    }),
  )

  const markerByKey = new Map(ihcMarkers.map((m) => [m.markerKey, m]))

  const ihcPaineis: IHCPanelResolved[] = ci.ihcPainelClinico.map((p) => ({
    nome: p.nome,
    descricao: p.descricao,
    cobertura: p.cobertura,
    marcadores: p.marcadores
      .map((mm) => markerByKey.get(mm.markerKey))
      .filter((m): m is IHCMarkerResolved => m != null),
  }))

  const coloracaoGrupos: ColoracaoGrupoResolved[] = ci.coloracaoPorPerguntaClinica.map((g) => ({
    pergunta: g.pergunta,
    contexto: g.contexto,
    coloracoes: g['colorações'].map((c) =>
      resolveOne(c.nome, c.codigo,
        { categoria: 'Coloração Específica', precoRotina: c.valorRotina, precoPesquisa: c.valorPesquisa }, idx),
    ),
  }))

  return { ihcMarkers, ihcPaineis, coloracaoGrupos }
}

export function expandPanel(panel: IHCPanelResolved, clientAntibody: boolean): Servico[] {
  const out: Servico[] = []
  for (const m of panel.marcadores) {
    const fam = clientAntibody ? m.cliente : m.histocell
    if (fam?.servico) out.push(fam.servico)
  }
  return out
}
