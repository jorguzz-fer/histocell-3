import { describe, it, expect } from 'vitest'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import {
  indexCatalog, resolveOne, buildClinicalIndex, expandPanel,
} from '../resolver'
import ci from '../clinical-intelligence.json'
import type { ClinicalIntelligenceJson, IHCPanelResolved } from '../types'

function mkServico(p: Partial<Servico> & { id: number; codigo: string }): Servico {
  return {
    id: p.id, codigo: p.codigo, codigoLegado: p.codigoLegado ?? null,
    categoria: p.categoria ?? 'Outros', nome: p.nome ?? 'X',
    precoBase: p.precoBase ?? 0, precoRotina: p.precoRotina ?? 0, precoPesquisa: p.precoPesquisa ?? 0,
  }
}

const SUGGESTED = { categoria: 'Imunohistoquímica', precoRotina: 85, precoPesquisa: 85 }

describe('indexCatalog', () => {
  it('indexa por codigo e codigoLegado', () => {
    const idx = indexCatalog([
      mkServico({ id: 1, codigo: '487', codigoLegado: 487 }),
      mkServico({ id: 2, codigo: 'CUSTOM-9', codigoLegado: null }),
    ])
    expect(idx.byCodigo.get('487')?.id).toBe(1)
    expect(idx.byLegado.get(487)?.id).toBe(1)
    expect(idx.byCodigo.get('CUSTOM-9')?.id).toBe(2)
  })
})

describe('resolveOne', () => {
  const idx = indexCatalog([mkServico({ id: 10, codigo: '487', codigoLegado: 487, nome: 'Imuno MUM1' })])

  it('resolve por codigo string', () => {
    const r = resolveOne('Ki67', '487', SUGGESTED, idx)
    expect(r.servico?.id).toBe(10)
    expect(r.clinicalName).toBe('Ki67')
  })

  it('fallback por codigoLegado quando codigo string não bate', () => {
    const idx2 = indexCatalog([mkServico({ id: 11, codigo: 'CUSTOM-1', codigoLegado: 44 })])
    const r = resolveOne('Ziehl', '44', SUGGESTED, idx2)
    expect(r.servico?.id).toBe(11)
  })

  it('servico null quando não existe (faltante)', () => {
    const r = resolveOne('Inexistente', '99999', SUGGESTED, idx)
    expect(r.servico).toBeNull()
    expect(r.suggested).toEqual(SUGGESTED)
  })
})

describe('buildClinicalIndex', () => {
  const servicos = [
    mkServico({ id: 100, codigo: '487', codigoLegado: 487 }),
    mkServico({ id: 101, codigo: '44',  codigoLegado: 44 }),
  ]
  const index = buildClinicalIndex(servicos, ci as unknown as ClinicalIntelligenceJson)

  it('mantém contagens do JSON', () => {
    expect(index.ihcMarkers).toHaveLength(326)
    expect(index.ihcPaineis).toHaveLength(10)
    expect(index.coloracaoGrupos).toHaveLength(13)
  })

  it('resolve marcador IMUNICANTICORPOHISTOCELLMUM1 (codigo 487) na família histocell', () => {
    const m = index.ihcMarkers.find((x) => x.markerKey === 'IMUNICANTICORPOHISTOCELLMUM1')
    expect(m?.histocell?.servico?.id).toBe(100)
    expect(m?.cliente).toBeNull()
  })

  it('marca coloração sem match como faltante (servico null)', () => {
    const grupo = index.coloracaoGrupos.find((g) =>
      g.coloracoes.some((c) => c.servico === null),
    )
    expect(grupo).toBeTruthy()
  })
})

describe('expandPanel', () => {
  it('expande painel para Servico[] reais pulando faltantes', () => {
    const panel: IHCPanelResolved = {
      nome: 'Teste', descricao: '', cobertura: '2/3',
      marcadores: [
        { markerKey: 'a', clinicalName: 'A',
          histocell: { clinicalName: 'A', codigo: '1', servico: mkServico({ id: 1, codigo: '1' }), suggested: SUGGESTED }, cliente: null },
        { markerKey: 'b', clinicalName: 'B',
          histocell: { clinicalName: 'B', codigo: '2', servico: null, suggested: SUGGESTED }, cliente: null },
        { markerKey: 'c', clinicalName: 'C',
          histocell: null,
          cliente: { clinicalName: 'C', codigo: '3', servico: mkServico({ id: 3, codigo: '3' }), suggested: SUGGESTED } },
      ],
    }
    const hist = expandPanel(panel, false)
    expect(hist.map((s) => s.id)).toEqual([1])
    const cli = expandPanel(panel, true)
    expect(cli.map((s) => s.id)).toEqual([3])
  })
})
