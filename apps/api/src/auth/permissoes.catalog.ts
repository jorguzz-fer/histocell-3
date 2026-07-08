/**
 * Catálogo de áreas de acesso (permissões). Fonte única usada pela matriz de
 * permissões (admin), pelo guard e pelo seed dos papéis do sistema.
 *
 * Cada `chave` corresponde a uma área/módulo do sistema (alinhada ao menu do
 * admin). Um papel que possui a chave tem acesso àquela área.
 */
export type AreaPermissao = {
  chave: string;
  label: string;
  grupo: string;
};

export const PERMISSOES: AreaPermissao[] = [
  { chave: 'dashboard', label: 'Dashboard', grupo: 'Geral' },
  { chave: 'clientes', label: 'Clientes', grupo: 'Cadastro' },
  { chave: 'orcamento', label: 'Orçamento', grupo: 'Operação' },
  { chave: 'recebimento', label: 'Recebimento', grupo: 'Operação' },
  { chave: 'fila', label: 'Fila', grupo: 'Operação' },
  { chave: 'pacotes', label: 'Pacotes', grupo: 'Operação' },
  { chave: 'etiquetas', label: 'Etiquetas', grupo: 'Operação' },
  { chave: 'ordens', label: 'Ordem de Serviço', grupo: 'Operação' },
  { chave: 'rastreio', label: 'Rastreio', grupo: 'Operação' },
  { chave: 'laudos', label: 'Laudos', grupo: 'Operação' },
  { chave: 'qualidade', label: 'Qualidade', grupo: 'Operação' },
  { chave: 'relatorios', label: 'Relatórios', grupo: 'Gestão' },
  { chave: 'comercial', label: 'Comercial', grupo: 'Gestão' },
  { chave: 'motivos', label: 'Motivos', grupo: 'Gestão' },
  { chave: 'financeiro', label: 'Financeiro', grupo: 'Gestão' },
  { chave: 'usuarios', label: 'Usuários e Acessos', grupo: 'Administração' },
];

export const CHAVES_PERMISSAO = PERMISSOES.map((p) => p.chave);

/** Slug do papel superadmin — sempre tem acesso total, não editável. */
export const PAPEL_SUPERADMIN = 'gerencia';

/**
 * Papéis do sistema (built-in) e suas permissões iniciais — espelham exatamente
 * o acesso atual do menu do admin, para não haver regressão no seed.
 * `gerencia` é superadmin (acesso total), então não precisa listar chaves.
 */
export const PAPEIS_SISTEMA: {
  nome: string;
  label: string;
  descricao: string;
  permissoes: string[];
}[] = [
  {
    nome: 'gerencia',
    label: 'Gerência',
    descricao: 'Acesso total ao sistema (administrador).',
    permissoes: [...CHAVES_PERMISSAO],
  },
  {
    nome: 'recepcao',
    label: 'Recepção',
    descricao: 'Atendimento, orçamento e recebimento.',
    permissoes: [
      'clientes', 'orcamento', 'recebimento', 'fila', 'pacotes',
      'etiquetas', 'ordens', 'rastreio', 'laudos', 'qualidade',
    ],
  },
  {
    nome: 'tecnico',
    label: 'Técnico',
    descricao: 'Fluxo de laboratório (sem telas com valores).',
    permissoes: [
      'clientes', 'recebimento', 'fila', 'etiquetas', 'ordens',
      'rastreio', 'laudos', 'qualidade',
    ],
  },
  {
    nome: 'financeiro',
    label: 'Financeiro',
    descricao: 'Operação + telas de valores, relatórios e cobrança.',
    permissoes: [
      'clientes', 'orcamento', 'recebimento', 'fila', 'pacotes',
      'etiquetas', 'ordens', 'rastreio', 'laudos', 'qualidade',
      'relatorios', 'comercial', 'financeiro',
    ],
  },
];
