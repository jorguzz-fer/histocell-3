/**
 * Rótulos das etapas da Ordem de Serviço, espelhando `apps/api/src/ordens/etapas.ts`.
 * Ficam aqui para as telas não repetirem o mapa cada uma do seu jeito.
 */
export const ETAPA_LABEL: Record<string, string> = {
  triagem: 'Triagem',
  macroscopia: 'Macroscopia',
  processamento: 'Processamento / Inclusão',
  microtomia: 'Microtomia (Corte)',
  coloracao: 'Coloração / Montagem',
  imunofluorescencia: 'Imunofluorescência',
  laudo: 'Laudo',
  finalizacao: 'Finalização',
  expedicao: 'Expedição / Retirada',
  arquivamento: 'Arquivamento',
  descarte: 'Descarte',
}

/** Linha principal do fluxo — a mesma ordem que o botão "Avançar" segue. */
export const ETAPAS_ORDEM = [
  'triagem',
  'macroscopia',
  'processamento',
  'microtomia',
  'coloracao',
  'laudo',
  'finalizacao',
  'expedicao',
] as const

/** Destinos válidos de "Mover para" — inclui os desvios fora da linha. */
export const ETAPAS_MOVIVEIS = [
  ...ETAPAS_ORDEM,
  'imunofluorescencia',
  'arquivamento',
  'descarte',
] as const

/** Inicial curta do quadradinho de cada fase (Ma/Mi evitam a colisão do "M"). */
export const ETAPA_INICIAL: Record<string, string> = {
  triagem: 'T',
  macroscopia: 'Ma',
  processamento: 'P',
  microtomia: 'Mi',
  coloracao: 'C',
  laudo: 'L',
  finalizacao: 'F',
  expedicao: 'E',
}

/** Mover para cá conclui a OS. */
export const ETAPAS_TERMINAIS = ['arquivamento', 'descarte']
