'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function TrocarSenhaPage() {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [saving, setSaving] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (nova.length < 8) { toast.error('A nova senha deve ter ao menos 8 caracteres.'); return }
    if (nova !== confirma) { toast.error('A confirmação não confere.'); return }
    setSaving(true)
    try {
      await api.post('/users/trocar-senha', { senhaAtual: atual, novaSenha: nova })
      toast.success('Senha alterada com sucesso.')
      setAtual(''); setNova(''); setConfirma('')
      // atualiza flag de primeiro acesso no storage local
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}')
        if (u) { u.primeiroAcesso = false; localStorage.setItem('user', JSON.stringify(u)) }
      } catch { /* ignore */ }
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao trocar senha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <PageHeader title="Trocar senha" subtitle="Altere sua senha de acesso" />
      <form onSubmit={salvar} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-5 space-y-4">
        <Input label="Senha atual" type="password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        <Input label="Nova senha" type="password" value={nova} onChange={(e) => setNova(e.target.value)} hint="Mínimo de 8 caracteres." />
        <Input label="Confirmar nova senha" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        <div className="flex justify-end">
          <Button type="submit" loading={saving}><KeyRound className="h-4 w-4" /> Alterar senha</Button>
        </div>
      </form>
    </div>
  )
}
