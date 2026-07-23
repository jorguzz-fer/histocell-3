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

/**
 * Mapa etapa da OS → departamento do Rastreio (chaves de `rastreio/departamentos.ts`).
 * Ao avançar a OS na Fila, o Rastreio das etiquetas do pedido é sincronizado por
 * este mapa, para que a "posição" do material reflita o andamento real mesmo sem
 * um scan físico de código de barras. `triagem` corresponde à Recepção; as demais
 * têm o mesmo nome nos dois sistemas.
 */
export const ETAPA_PARA_DEPARTAMENTO: Record<EtapaOrdem, string> = {
  triagem: 'recepcao',
  macroscopia: 'macroscopia',
  processamento: 'processamento',
  microtomia: 'microtomia',
  coloracao: 'coloracao',
  laudo: 'laudo',
  finalizacao: 'finalizacao',
  expedicao: 'expedicao',
};
