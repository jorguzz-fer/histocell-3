'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  UserPlus, Pencil, KeyRound, Power, History, Shield, Plus, Trash2, Users as UsersIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ClienteAvatar } from '@/components/ui/ClienteAvatar'
import { api } from '@/lib/api'
import { UserDrawer } from './UserDrawer'
import { PapelDrawer } from './PapelDrawer'
import { AuditoriaDrawer } from './AuditoriaDrawer'
import type { AreaPermissao, Papel, UsuarioAdmin } from './types'

type Aba = 'usuarios' | 'papeis'

export default function UsuariosPage() {
  const [aba, setAba] = useState<Aba>('usuarios')
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [papeis, setPapeis] = useState<Papel[]>([])
  const [catalogo, setCatalogo] = useState<AreaPermissao[]>([])
  const [loading, setLoading] = useState(true)

  const [userDrawer, setUserDrawer] = useState<{ open: boolean; alvo: UsuarioAdmin | null }>({ open: false, alvo: null })
  const [papelDrawer, setPapelDrawer] = useState<{ open: boolean; alvo: Papel | null }>({ open: false, alvo: null })
  const [auditDrawer, setAuditDrawer] = useState<{ open: boolean; alvo: UsuarioAdmin | null }>({ open: false, alvo: null })
  const [reset, setReset] = useState<{ alvo: UsuarioAdmin; senha: string } | null>(null)
  const [resetSaving, setResetSaving] = useState(false)

  const carregar = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<UsuarioAdmin[]>('/users/admin'),
      api.get<Papel[]>('/papeis'),
      api.get<AreaPermissao[]>('/papeis/catalogo'),
    ])
      .then(([u, p, c]) => { setUsuarios(u); setPapeis(p); setCatalogo(c) })
      .catch((e) => toast.error(e.message ?? 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function toggleAtivo(u: UsuarioAdmin) {
    try {
      await api.patch(`/users/${u.id}/ativo`, { ativo: !u.ativo })
      toast.success(u.ativo ? 'Usuário desativado.' : 'Usuário ativado.')
      carregar()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro')
    }
  }

  async function confirmarReset() {
    if (!reset) return
    if (reset.senha.length < 8) { toast.error('A senha deve ter ao menos 8 caracteres.'); return }
    setResetSaving(true)
    try {
      await api.post(`/users/${reset.alvo.id}/reset-senha`, { novaSenha: reset.senha })
      toast.success('Senha redefinida. O usuário trocará no próximo acesso.')
      setReset(null)
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao redefinir senha')
    } finally {
      setResetSaving(false)
    }
  }

  async function excluirPapel(p: Papel) {
    if (!confirm(`Excluir o papel "${p.label}"?`)) return
    try {
      await api.delete(`/papeis/${p.id}`)
      toast.success('Papel excluído.')
      carregar()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao excluir papel')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários e Acessos"
        subtitle="Gerencie usuários, papéis e permissões do sistema"
        action={
          aba === 'usuarios' ? (
            <Button onClick={() => setUserDrawer({ open: true, alvo: null })}>
              <UserPlus className="h-4 w-4" /> Novo usuário
            </Button>
          ) : (
            <Button onClick={() => setPapelDrawer({ open: true, alvo: null })}>
              <Plus className="h-4 w-4" /> Novo papel
            </Button>
          )
        }
      />

      {/* Abas */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {([['usuarios', 'Usuários', UsersIcon], ['papeis', 'Papéis e Permissões', Shield]] as const).map(
          ([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                aba === id
                  ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <p className="py-12 text-center text-[13px] text-slate-400">Carregando…</p>
      ) : aba === 'usuarios' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Usuário</th>
                  <th className="px-4 py-2.5 font-semibold">Papel</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usuarios.map((u) => (
                  <tr key={u.id} className={u.ativo ? '' : 'opacity-60'}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ClienteAvatar nome={u.nome} seed={u.id} size={30} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{u.nome}</p>
                          <p className="text-[12px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="blue">{u.roleLabel}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {u.ativo
                        ? <Badge variant="green">Ativo</Badge>
                        : <Badge variant="slate">Inativo</Badge>}
                      {u.primeiroAcesso && u.ativo && (
                        <Badge variant="amber" className="ml-1.5">1º acesso</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setUserDrawer({ open: true, alvo: u })} title="Editar"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setReset({ alvo: u, senha: '' })} title="Redefinir senha"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded">
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setAuditDrawer({ open: true, alvo: u })} title="Auditoria"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => toggleAtivo(u)} title={u.ativo ? 'Desativar' : 'Ativar'}
                          className={`p-1.5 rounded ${u.ativo ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}>
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {papeis.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{p.label}</h3>
                    {p.sistema && <Badge variant="slate">Sistema</Badge>}
                    {p.superadmin && <Badge variant="purple">Acesso total</Badge>}
                    {!p.ativo && <Badge variant="rose">Inativo</Badge>}
                  </div>
                  {p.descricao && <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{p.descricao}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setPapelDrawer({ open: true, alvo: p })} title={p.sistema ? 'Ver' : 'Editar'}
                    className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {!p.sistema && (
                    <button onClick={() => excluirPapel(p)} title="Excluir"
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-[12px] text-slate-500">
                <span>{p.usuarios} usuário(s)</span>
                <span>·</span>
                <span>{p.superadmin ? 'todas as áreas' : `${p.permissoes.length} área(s)`}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <UserDrawer
        open={userDrawer.open}
        onClose={() => setUserDrawer({ open: false, alvo: null })}
        onSaved={carregar}
        papeis={papeis}
        usuario={userDrawer.alvo}
      />
      <PapelDrawer
        open={papelDrawer.open}
        onClose={() => setPapelDrawer({ open: false, alvo: null })}
        onSaved={carregar}
        catalogo={catalogo}
        papel={papelDrawer.alvo}
      />
      <AuditoriaDrawer
        open={auditDrawer.open}
        onClose={() => setAuditDrawer({ open: false, alvo: null })}
        usuario={auditDrawer.alvo}
      />

      {/* Modal reset de senha */}
      {reset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setReset(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-card shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Redefinir senha</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              {reset.alvo.nome} — a nova senha terá troca obrigatória no próximo acesso.
            </p>
            <Input
              label="Nova senha"
              type="text"
              value={reset.senha}
              onChange={(e) => setReset({ ...reset, senha: e.target.value })}
              placeholder="mín. 8 caracteres"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setReset(null)}>Cancelar</Button>
              <Button onClick={confirmarReset} loading={resetSaving}>Redefinir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
