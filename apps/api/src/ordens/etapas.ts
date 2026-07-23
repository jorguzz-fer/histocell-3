/**
 * Fonte única das etapas da Ordem de Serviço / Fila do laboratório.
 * Alinhada ao fluxo validado com o Célio (7ª homologação):
 * Triagem → Macroscopia → Processamento/Inclusão → Microtomia (Corte) →
 * Coloração/Montagem → Laudo (quando houver) → Finalização (conferência fina) →
 * Expedição/Retirada.
 *
 * `ETAPAS_ORDEM` é a **linha principal** (o botão "Avançar" segue esta sequência).
 * Além dela existem **departamentos extras** fora da linha (Imunofluorescência,
 * Arquivamento, Descarte) — o item só vai para eles pela ação "Mover para", não
 * pelo avanço linear. Arquivamento e Descarte são **terminais**: mover para eles
 * conclui a OS.
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

/** Departamentos fora da linha principal — recebem itens só por "Mover para". */
export const ETAPAS_EXTRA = ['imunofluorescencia', 'arquivamento', 'descarte'] as const;

/** Etapas terminais: mover um item para elas conclui a OS. */
export const ETAPAS_TERMINAIS: string[] = ['arquivamento', 'descarte'];

export const ETAPA_LABEL: Record<string, string> = {
  triagem: 'Triagem / Recebidas',
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
};

/**
 * Colunas exibidas na Fila = linha principal + extras, na ordem do fluxo.
 * Imunofluorescência entra após a Coloração; Arquivamento/Descarte no fim (as
 * colunas terminais mostram os itens já concluídos ali).
 */
export const ETAPAS_FILA: string[] = [
  'triagem',
  'macroscopia',
  'processamento',
  'microtomia',
  'coloracao',
  'imunofluorescencia',
  'laudo',
  'finalizacao',
  'expedicao',
  'arquivamento',
  'descarte',
];

/** Destinos válidos da ação "Mover para" (todas as colunas da Fila). */
export const ETAPAS_MOVIVEIS: string[] = [...ETAPAS_FILA];

/**
 * Mapa etapa da OS → departamento do Rastreio (chaves de `rastreio/departamentos.ts`).
 * Ao avançar/mover a OS na Fila, o Rastreio das etiquetas do pedido é
 * sincronizado por este mapa, para que a "posição" do material reflita o
 * andamento real mesmo sem um scan físico de código de barras. `triagem`
 * corresponde à Recepção; as demais têm o mesmo nome nos dois sistemas.
 */
export const ETAPA_PARA_DEPARTAMENTO: Record<string, string> = {
  triagem: 'recepcao',
  macroscopia: 'macroscopia',
  processamento: 'processamento',
  microtomia: 'microtomia',
  coloracao: 'coloracao',
  imunofluorescencia: 'imunofluorescencia',
  laudo: 'laudo',
  finalizacao: 'finalizacao',
  expedicao: 'expedicao',
  arquivamento: 'arquivamento',
  descarte: 'descarte',
};
