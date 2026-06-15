// Macro-grupos: camada de navegação sobre as categorias reais do catálogo.
// NÃO altera os dados — apenas agrupa as categorias existentes nos poucos
// grupos que o Célio pediu (microscopia/corte, criostato, colorações, imuno…),
// deixando a seleção mais simples sem perder a categoria detalhada de cada serviço.
//
// Para reclassificar uma categoria, edite SOMENTE o mapa GRUPO_DE_CATEGORIA.

export const MACRO_GRUPOS = [
  'Macroscopia',
  'Processamento & Corte',
  'Criostato',
  'Colorações',
  'Citologia',
  'Imuno',
  'Outros',
] as const

export type MacroGrupo = (typeof MACRO_GRUPOS)[number]

export const GRUPO_DE_CATEGORIA: Record<string, MacroGrupo> = {
  'Macroscopia': 'Macroscopia',
  'Processamento': 'Processamento & Corte',
  'Cortes Histológico': 'Processamento & Corte',
  'Cortes Eppendorf': 'Processamento & Corte',
  'Criostato': 'Criostato',
  'Colorações': 'Colorações',
  'Coloração Específica': 'Colorações',
  'Citologia': 'Citologia',
  'Imunohistoquímica': 'Imuno',
  'Imunofluorescência': 'Imuno',
  'Análises': 'Outros',
  'Laudos': 'Outros',
  'Imagem': 'Outros',
  'Outros': 'Outros',
  'Descarte/Devolução': 'Outros',
  'IPOG': 'Outros',
  'Insumos/Materiais': 'Outros',
  'Anticorpo': 'Outros',
  'Logística': 'Outros',
  'Consultoria/Serviços': 'Outros',
  'Manutenção': 'Outros',
}

export function grupoDeCategoria(cat: string): MacroGrupo {
  return GRUPO_DE_CATEGORIA[cat] ?? 'Outros'
}

/** Agrupa uma lista de categorias nos macro-grupos, na ordem canônica. */
export function agruparCategorias(
  categorias: string[],
): { grupo: MacroGrupo; categorias: string[] }[] {
  const map = new Map<MacroGrupo, string[]>()
  for (const cat of categorias) {
    const g = grupoDeCategoria(cat)
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(cat)
  }
  return MACRO_GRUPOS.filter((g) => map.has(g)).map((g) => ({
    grupo: g,
    categorias: map.get(g)!.sort((a, b) => a.localeCompare(b, 'pt-BR')),
  }))
}
