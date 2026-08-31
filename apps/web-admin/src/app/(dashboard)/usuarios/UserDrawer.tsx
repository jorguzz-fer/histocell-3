'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { Papel, UsuarioAdmin } from './types'

export function UserDrawer({
  open,
  onClose,
  onSaved,
  papeis,
  usuario,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  papeis: Papel[]
  usuario: UsuarioAdmin | null
}) {
  const editando = !!usuario
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setNome(usuario?.nome ?? '')
      setEmail(usuario?.email ?? '')
      setRole(usuario?.role ?? papeis.find((p) => p.ativo)?.nome ?? '')
      setSenha('')
    }
  }, [open, usuario, papeis])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || !role) {
      toast.error('Preencha nome, e-mail e papel.')
      return
    }
    if (!editando && senha.length < 8) {
      toast.error('A senha inicial deve ter ao menos 8 caracteres.')
      return
    }
    setSaving(true)
    try {
      if (editando) {
        await api.patch(`/users/${usuario!.id}`, { nome: nome.trim(), email: email.trim(), role })
        toast.success('Usuário atualizado.')
      } else {
        await api.post('/users', { nome: nome.trim(), email: email.trim(), senha, role })
        toast.success('Usuário criado. Ele deverá trocar a senha no primeiro acesso.')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  const opcoesPapel = papeis
    .filter((p) => p.ativo || p.nome === usuario?.role)
    .map((p) => ({ value: p.nome, label: p.label + (p.ativo ? '' : ' (inativo)') }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar usuário' : 'Novo usuário'}
      subtitle={editando ? usuario?.email : 'Cadastre um novo acesso ao sistema'} width="max-w-xl"
    >
      <form onSubmit={salvar} className="space-y-4">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
        <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@histocell.com.br" />
        {!editando && (
          <Input
            label="Senha inicial"
            type="text"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="mín. 8 caracteres"
            hint="O usuário será obrigado a trocá-la no primeiro acesso."
          />
        )}
        <Select
          label="Papel"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={opcoesPapel}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{editando ? 'Salvar' : 'Criar usuário'}</Button>
        </div>
      </form>
    </Modal>
  )
}
