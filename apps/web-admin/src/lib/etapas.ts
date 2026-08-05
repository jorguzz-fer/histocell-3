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
