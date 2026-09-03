export type TipoRecipiente = { id: number; nome: string }

/** Estado do material: define o departamento de destino (reunião 02/09). */
export const CONDICOES = [
  {
    value: 'macroscopia',
    label: 'Macroscopia',
    ajuda: 'Peça/animal no pote — a macroscopia abre, descreve e gera os cassetes',
    cor: 'roxo',
    pedePaciente: true,
  },
  {
    value: 'molhado',
    label: 'Molhado',
    ajuda: 'Cassete em formol que o cliente já montou — vai ao Processamento',
    cor: 'sky',
    pedePaciente: false,
  },
  {
    value: 'seco',
    label: 'Seco',
    ajuda: 'Bloco ou lâmina — vai direto ao corte (Microtomia)',
    cor: 'amber',
    pedePaciente: false,
  },
] as const

/** Condições que pedem o nome do paciente por pacote. */
export const CONDICOES_COM_PACIENTE = CONDICOES.filter((c) => c.pedePaciente).map((c) => c.value)

/** Classes do botão de condição, por cor e estado (selecionado/normal). */
export const CONDICAO_BTN: Record<string, { on: string }> = {
  roxo: {
    on: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/50 dark:bg-violet-500/10 dark:text-violet-300',
  },
  sky: {
    on: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-300',
  },
  amber: {
    on: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300',
  },
}

/** Rótulo curto de cada condição para exibição em chips/listas. */
export const CONDICAO_LABEL: Record<string, string> = {
  macroscopia: 'Macroscopia',
  molhado: 'Molhado',
  seco: 'Seco',
}

/** Volume registrado na tela Entrada (Recipiente ligado ao cliente). */
export type EntradaAvulsa = {
  id: number
  tipo: string
  condicao: string | null
  paciente: string | null
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
  /** Fase atual da OS deste volume — alimenta o chip do guia na lista do dia. */
  osEtapa: string | null
  osStatus: string | null
}
