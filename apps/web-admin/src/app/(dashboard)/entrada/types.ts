export type TipoRecipiente = { id: number; nome: string }

/** Estado do material: define o departamento de destino. */
export const CONDICOES = [
  { value: 'molhado', label: 'Molhado', ajuda: 'Pote com formol — abre na Macroscopia' },
  { value: 'seco', label: 'Seco', ajuda: 'Cassete, bloco ou lâmina — vai direto ao corte' },
] as const

/** Volume registrado na tela Entrada (Recipiente ligado ao cliente). */
export type EntradaAvulsa = {
  id: number
  tipo: string
  condicao: string | null
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
  ordemServicoId: number | null
  osNumero: string | null
  osCodigoCurto: string | null
}
