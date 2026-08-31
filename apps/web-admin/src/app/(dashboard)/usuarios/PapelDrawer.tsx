'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import type { AreaPermissao, Papel } from './types'

export function PapelDrawer({
  open,
  onClose,
  onSaved,
  catalogo,
  papel,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  catalogo: AreaPermissao[]
  papel: Papel | null
}) {
  const editando = !!papel
  const somenteLeitura = !!papel?.sistema // papéis do sistema têm acesso fixo
  const [label, setLabel] = useState('')
  const [descricao, setDescricao] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setLabel(papel?.label ?? '')
      setDescricao(papel?.descricao ?? '')
      setSel(new Set(papel?.superadmin ? catalogo.map((c) => c.chave) : papel?.permissoes ?? []))
    }
  }, [open, papel, catalogo])

  const grupos = useMemo(() => {
    const m = new Map<string, AreaPermissao[]>()
    for (const c of catalogo) {
      if (!m.has(c.grupo)) m.set(c.grupo, [])
      m.get(c.grupo)!.push(c)
    }
    return Array.from(m.entries())
  }, [catalogo])

  function toggle(chave: string) {
    if (somenteLeitura) return
    setSel((prev) => {
      const n = new Set(prev)
      if (n.has(chave)) n.delete(chave)
      else n.add(chave)
      return n
    })
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      toast.error('Informe o nome do papel.')
      return
    }
    if (!somenteLeitura && sel.size === 0) {
      toast.error('Marque ao menos uma área de acesso.')
      return
    }
    setSaving(true)
    try {
      const permissoes = Array.from(sel)
      if (editando) {
        await api.patch(`/papeis/${papel!.id}`, somenteLeitura
          ? { label: label.trim(), descricao: descricao.trim() || undefined }
          : { label: label.trim(), descricao: descricao.trim() || undefined, permissoes })
        toast.success('Papel atualizado.')
      } else {
        await api.post('/papeis', { label: label.trim(), descricao: descricao.trim() || undefined, permissoes })
        toast.success('Papel criado.')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar papel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? `Papel: ${papel?.label}` : 'Novo papel'}
      subtitle={somenteLeitura ? 'Papel do sistema — acesso fixo (somente leitura)' : 'Defina o nome e as áreas que este papel acessa'} width="max-w-xl"
    >
      <form onSubmit={salvar} className="space-y-5">
        <Input label="Nome do papel" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Estagiário, Auxiliar…" disabled={somenteLeitura && papel?.superadmin} />
        <Input label="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Para que serve este papel" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Áreas de acesso</label>
            {somenteLeitura && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Lock className="h-3 w-3" /> fixo
              </span>
            )}
          </div>
          <div className="space-y-4">
            {grupos.map(([grupo, itens]) => (
              <div key={grupo}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">{grupo}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {itens.map((c) => {
                    const marcado = sel.has(c.chave)
                    return (
                      <label
                        key={c.chave}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-[13px] transition-colors ${
                          somenteLeitura ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          marcado
                            ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={somenteLeitura}
                          onChange={() => toggle(c.chave)}
                          className="rounded border-slate-300"
                        />
                        {c.label}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{editando ? 'Salvar' : 'Criar papel'}</Button>
        </div>
      </form>
    </Modal>
  )
}
