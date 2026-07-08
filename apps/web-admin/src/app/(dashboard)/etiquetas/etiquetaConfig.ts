// Configuração do tamanho físico da etiqueta (impressora Zebra).
// Persistida em localStorage; ajustável pelo usuário conforme o rolo.
export type EtiquetaConfig = { larguraMm: number; alturaMm: number }

const KEY = 'etiquetaConfig'
// Etiqueta da lâmina (colada na ponta fosca): 24 mm × 18 mm.
export const ETIQUETA_CONFIG_PADRAO: EtiquetaConfig = { larguraMm: 24, alturaMm: 18 }

export function lerEtiquetaConfig(): EtiquetaConfig {
  if (typeof window === 'undefined') return ETIQUETA_CONFIG_PADRAO
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return ETIQUETA_CONFIG_PADRAO
    const c = JSON.parse(raw)
    const larguraMm = Number(c.larguraMm)
    const alturaMm = Number(c.alturaMm)
    if (larguraMm > 0 && alturaMm > 0) return { larguraMm, alturaMm }
  } catch {}
  return ETIQUETA_CONFIG_PADRAO
}

export function salvarEtiquetaConfig(c: EtiquetaConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch {}
}
