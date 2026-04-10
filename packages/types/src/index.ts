// ==========================================
// Histocell — Tipos compartilhados
// ==========================================

// Roles do sistema
export type Role = 'gerencia' | 'tecnico' | 'recepcao' | 'financeiro' | 'cliente';

// Status de pedido
export type StatusPedido = 
  | 'rascunho'
  | 'enviado' 
  | 'recebido' 
  | 'em_analise'
  | 'laudo_pronto'
  | 'entregue';

// Status de amostra  
export type StatusAmostra =
  | 'pendente'
  | 'recebida'
  | 'faltante'
  | 'nao_conforme'
  | 'em_triagem'
  | 'em_macroscopia'
  | 'em_processamento'
  | 'laudo_emitido';

// Status de ordem de serviço
export type StatusOS =
  | 'fila'
  | 'em_andamento'
  | 'pausada'
  | 'concluida'
  | 'cancelada';

// Status financeiro
export type StatusFinanceiro =
  | 'pendente'
  | 'faturado'
  | 'pago'
  | 'vencido'
  | 'cancelado';

// Status de orçamento (CRM)
export type StatusOrcamento =
  | 'rascunho'
  | 'enviado'
  | 'em_negociacao'
  | 'ganho'
  | 'perdido';

// Tipo de cliente
export type TipoCliente = 'PJ' | 'PF';
export type SegmentoCliente = 'recorrente' | 'esporadico' | 'pesquisador';

// Tipo de pessoa (contato)
export interface ClienteBase {
  id: number;
  tipo: TipoCliente;
  nome: string;
  documento: string; // CPF ou CNPJ (criptografado no banco)
  email: string;
  telefone: string;
  segmento: SegmentoCliente;
}

// Pedido
export interface PedidoBase {
  id: number;
  clienteId: number;
  numero: string;
  status: StatusPedido;
  dataEnvio: string;
  observacoes?: string;
}

// Amostra
export interface AmostraBase {
  id: number;
  pedidoId: number;
  numeroInterno: string;
  numeroCliente?: string;
  especie: string;
  material: string;
  status: StatusAmostra;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth
export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    nome: string;
    email: string;
    role: Role;
  };
}
