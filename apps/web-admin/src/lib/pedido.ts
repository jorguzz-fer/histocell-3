/** Código curto p/ exibição (ex.: 42 → "#0042"); cai no número completo se sem seq. */
export function codigoCurto(seq?: number | null, numeroCompleto?: string): string {
  if (seq != null) return `#${String(seq).padStart(4, '0')}`
  return numeroCompleto ?? ''
}

/** Código curto do pedido (alias semântico). */
export const codigoCurtoPedido = codigoCurto
/** Código curto da OS (alias semântico). */
export const codigoCurtoOS = codigoCurto
