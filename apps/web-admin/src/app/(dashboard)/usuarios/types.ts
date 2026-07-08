export type UsuarioAdmin = {
  id: number
  nome: string
  email: string
  role: string
  roleLabel: string
  ativo: boolean
  primeiroAcesso: boolean
  createdAt: string
  updatedAt: string
}

export type Papel = {
  id: number
  nome: string
  label: string
  descricao?: string | null
  sistema: boolean
  ativo: boolean
  superadmin: boolean
  permissoes: string[]
  usuarios: number
}

export type AreaPermissao = {
  chave: string
  label: string
  grupo: string
}

export type AuditoriaItem = {
  id: number
  action: string
  entity: string
  entityId?: number | null
  details?: string | null
  createdAt: string
}
