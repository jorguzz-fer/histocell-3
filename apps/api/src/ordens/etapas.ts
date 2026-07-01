/**
 * Fonte única das etapas da Ordem de Serviço / Fila do laboratório.
 * Alinhada ao fluxo validado com o Célio (7ª homologação):
 * Triagem → Macroscopia → Processamento/Inclusão → Microtomia (Corte) →
 * Coloração/Montagem → Laudo (quando houver) → Finalização (conferência fina) →
 * Expedição/Retirada.
 */
export const ETAPAS_ORDEM = [
  'triagem',
  'macroscopia',
  'processamento',
  'microtomia',
  'coloracao',
  'laudo',
  'finalizacao',
  'expedicao',
] as const;

export type EtapaOrdem = (typeof ETAPAS_ORDEM)[number];

export const ETAPA_LABEL: Record<EtapaOrdem, string> = {
  triagem: 'Triagem / Recebidas',
  macroscopia: 'Macroscopia',
  processamento: 'Processamento / Inclusão',
  microtomia: 'Microtomia (Corte)',
  coloracao: 'Coloração / Montagem',
  laudo: 'Laudo',
  finalizacao: 'Finalização',
  expedicao: 'Expedição / Retirada',
};

/** Etapas exibidas como colunas na Fila (todas as de trabalho). */
export const ETAPAS_FILA: EtapaOrdem[] = [...ETAPAS_ORDEM];
