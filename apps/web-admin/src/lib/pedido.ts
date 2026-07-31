/** Código curto do pedido p/ exibição (ex.: 42 → "#0042"); cai no número completo. */
export function codigoCurtoPedido(seq?: number | null, numero?: string): string {
  if (seq != null) return `#${String(seq).padStart(4, '0')}`
  return numero ?? ''
}
