// Identidade visual do cliente: cor única + iniciais, consistente em todas as
// telas (fila, OS, recebimento, etiquetas, rastreio, laudos, financeiro…).
//
// A cor é derivada do ID do cliente (único) usando o ângulo áureo (137.508°),
// que espalha os matizes de forma bem distribuída — clientes diferentes ganham
// cores distintas e cada cliente mantém SEMPRE a mesma cor. Sem id, cai num
// hash do nome (determinístico, mas pode repetir).

function hueDoSeed(seed: string | number): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return (seed * 137.508) % 360
  }
  const s = String(seed ?? '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

export type ClienteCor = { bg: string; borda: string; fg: string; hue: number }

/** Cor estável e única do cliente (para avatar/borda). */
export function clienteCor(seed: string | number): ClienteCor {
  const hue = hueDoSeed(seed)
  return {
    bg: `hsl(${hue}, 62%, 45%)`, // fundo do avatar (texto branco)
    borda: `hsl(${hue}, 60%, 50%)`, // borda/realce em listas
    fg: '#ffffff',
    hue,
  }
}

/** Iniciais do nome/empresa (ex.: "AlchemyPet" → "AP", "Sara Graham" → "SG"). */
export function iniciais(nome: string): string {
  const limpo = (nome ?? '').trim()
  if (!limpo) return '?'
  const palavras = limpo.split(/[\s\-_.]+/).filter(Boolean)
  if (palavras.length >= 2) return (palavras[0][0] + palavras[1][0]).toUpperCase()
  // uma palavra só: usa as maiúsculas internas (camelCase) ou as 2 primeiras letras
  const maiusculas = limpo.match(/[A-ZÀ-Ý]/g)
  if (maiusculas && maiusculas.length >= 2) return (maiusculas[0] + maiusculas[1]).toUpperCase()
  return limpo.slice(0, 2).toUpperCase()
}
