/** Departamentos do fluxo do laboratório, em ordem. */
export const DEPARTAMENTOS = [
  { key: 'recepcao', label: 'Recepção / Conferência', ordem: 1 },
  { key: 'macroscopia', label: 'Macroscopia', ordem: 2 },
  { key: 'processamento', label: 'Processamento / Inclusão', ordem: 3 },
  { key: 'microtomia', label: 'Microtomia (Corte)', ordem: 4 },
  { key: 'coloracao', label: 'Coloração / Montagem', ordem: 5 },
  { key: 'laudo', label: 'Laudo', ordem: 6 },
  { key: 'expedicao', label: 'Expedição', ordem: 7 },
] as const;

export type DepartamentoKey = (typeof DEPARTAMENTOS)[number]['key'];

export const DEPARTAMENTO_KEYS: string[] = DEPARTAMENTOS.map((d) => d.key);

/** Último departamento do fluxo — concluir a saída dele = item concluído. */
export const DEPARTAMENTO_FINAL: DepartamentoKey = 'expedicao';

export const TIPOS_EVENTO = ['entrada', 'saida'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const STATUS_RASTREIO = [
  'nao_iniciado',
  'em_andamento',
  'aguardando',
  'concluido',
] as const;
