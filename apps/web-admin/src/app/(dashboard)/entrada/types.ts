export type TipoRecipiente = { id: number; nome: string }

/** Volume registrado na tela Entrada (Recipiente ligado ao cliente). */
export type EntradaAvulsa = {
  id: number
  tipo: string
  codigo: string | null
  observacoes: string | null
  recebidoPor: string | null
  createdAt: string
  clienteId: number | null
  clienteNome: string
  clienteNomeFantasia: string | null
  /** true quando já foi vinculada a um pedido/orçamento. */
  vinculada: boolean
  pedidoId: number | null
  pedidoNumero: string | null
  pedidoCodigoCurto: string | null
  totalAmostras: number
}
