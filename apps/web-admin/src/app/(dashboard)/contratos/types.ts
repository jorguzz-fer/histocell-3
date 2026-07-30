export type Contrato = {
  id: number
  clienteId: number
  valorMensal: number
  dataInicio: string
  duracaoMeses: number
  dataFim: string
  diaCobranca: number
  ativo: boolean
  observacoes?: string | null
  diasParaVencer: number
  vencido: boolean
  cliente: { id: number; nome: string; nomeFantasia?: string | null }
}
