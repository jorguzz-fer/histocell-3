/** Departamentos do fluxo do laboratório, em ordem. */
export const DEPARTAMENTOS = [
  { key: 'recepcao', label: 'Recepção / Conferência', ordem: 1 },
  { key: 'macroscopia', label: 'Macroscopia', ordem: 2 },
  { key: 'processamento', label: 'Processamento / Inclusão', ordem: 3 },
  { key: 'microtomia', label: 'Microtomia (Corte)', ordem: 4 },
  { key: 'coloracao', label: 'Coloração / Montagem', ordem: 5 },
  { key: 'imunofluorescencia', label: 'Imunofluorescência', ordem: 6 },
  { key: 'laudo', label: 'Laudo', ordem: 7 },
  { key: 'finalizacao', label: 'Finalização', ordem: 8 },
  { key: 'expedicao', label: 'Expedição', ordem: 9 },
  { key: 'arquivamento', label: 'Arquivamento', ordem: 10 },
  { key: 'descarte', label: 'Descarte', ordem: 11 },
] as const;

export type DepartamentoKey = (typeof DEPARTAMENTOS)[number]['key'];

export const DEPARTAMENTO_KEYS: string[] = DEPARTAMENTOS.map((d) => d.key);

/** Último departamento do fluxo padrão — concluir a saída dele = item concluído. */
export const DEPARTAMENTO_FINAL: DepartamentoKey = 'expedicao';

/**
 * Departamentos terminais: sair de qualquer um deles marca a etiqueta como
 * `concluido`. Além da Expedição (retirada normal), Arquivamento e Descarte são
 * destinos de fim de linha do material.
 */
export const DEPARTAMENTOS_FINAIS: DepartamentoKey[] = [
  'expedicao',
  'arquivamento',
  'descarte',
];

export const TIPOS_EVENTO = ['entrada', 'saida'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const STATUS_RASTREIO = [
  'nao_iniciado',
  'em_andamento',
  'aguardando',
  'concluido',
] as const;
