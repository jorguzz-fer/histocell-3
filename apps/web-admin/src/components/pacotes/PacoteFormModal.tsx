'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ServicoSearchInput } from '@/components/ui/ServicoSearchInput'
import { api } from '@/lib/api'
import { fmtBRL } from '@/hooks/useOrderCart'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { Pacote } from '@/app/(dashboard)/pacotes/types'

type ItemForm = {
  servicoId: number
  nome: string
  categoria: string
  quantidade: number
  preco: number
}

interface PacoteFormModalProps {
  open: boolean
  onClose: () => void
  pacote: Pacote | null     // null = criar
  servicos: Servico[]
  onSaved: () => void
}

export function PacoteFormModal({ open, onClose, pacote, servicos, onSaved }: PacoteFormModalProps) {
  const isEdit = Boolean(pacote)
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [itens, setItens] = useState<ItemForm[]>([])
  const [pick, setPick] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (pacote) {
      setCodigo(pacote.codigo)
      setNome(pacote.nome)
      setDescricao(pacote.descricao ?? '')
      setItens(pacote.itens.map((it) => ({
        servicoId: it.servicoId,
        nome: it.servico.nome,
        categoria: it.servico.categoria,
        quantidade: it.quantidade,
        preco: Number(it.preco),
      })))
    } else {
      setCodigo(''); setNome(''); setDescricao(''); setItens([])
    }
    setPick('')
  }, [open, pacote])

  function addServico(servicoId: string, s: Servico | null) {
    if (!s) return
    if (itens.some((it) => it.servicoId === s.id)) {
      toast.error('Serviço já está no pacote')
      return
    }
    setItens((prev) => [...prev, {
      servicoId: s.id, nome: s.nome, categoria: s.categoria,
      quantidade: 1, preco: Number(s.precoRotina || s.precoBase),
    }])
    setPick('')
  }

  function updateItem(servicoId: number, field: 'quantidade' | 'preco', value: number) {
    setItens((prev) => prev.map((it) => (it.servicoId === servicoId ? { ...it, [field]: value } : it)))
  }

  function removeItem(servicoId: number) {
    setItens((prev) => prev.filter((it) => it.servicoId !== servicoId))
  }

  const total = itens.reduce((s, it) => s + it.preco * it.quantidade, 0)

  // Alerta de colisão: o código do pacote já é usado por um serviço (código ou código legado).
  // Evita o caso "digito 943 no pedido e vem o serviço, não o pacote".
  const servicoColidente = (() => {
    const c = codigo.trim()
    if (!c) return null
    const cn = parseInt(c, 10)
    return servicos.find(
      (s) => s.codigo === c || (Number.isFinite(cn) && s.codigoLegado === cn),
    ) ?? null
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) { toast.error('Informe o código'); return }
    if (!nome.trim()) { toast.error('Informe o nome'); return }
    if (itens.length === 0) { toast.error('Adicione ao menos um serviço'); return }

    setSaving(true)
    try {
      const payload = {
        codigo: codigo.trim(),
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        itens: itens.map((it) => ({ servicoId: it.servicoId, quantidade: it.quantidade, preco: it.preco })),
      }
      if (isEdit && pacote) {
        await api.patch(`/pacotes/${pacote.id}`, payload)
        toast.success('Pacote atualizado!')
      } else {
        await api.post('/pacotes', payload)
        toast.success('Pacote criado!')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar pacote')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar pacote' : 'Novo pacote'}
      subtitle={isEdit ? `#${pacote?.id} — ${pacote?.nome}` : 'Combo de serviços com preço próprio'}
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: PCT-HE" />
          <div className="col-span-2">
            <Input label="Nome do pacote" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Processamento + Inclusão + Corte HE" />
          </div>
        </div>

        {servicoColidente && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-300">
            ⚠️ O código <strong>{codigo.trim()}</strong> já é usado pelo serviço{' '}
            <strong>{servicoColidente.nome}</strong> ({fmtBRL(Number(servicoColidente.precoRotina))}).
            Buscar por esse código no pedido pode trazer o serviço também — considere um código exclusivo (ex.: <code>PCT-{codigo.trim()}</code>).
          </div>
        )}

        <Input label="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Quando usar este pacote…" />

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Serviços do pacote
          </h3>

          <ServicoSearchInput
            servicos={servicos}
            value={pick}
            onChange={addServico}
            placeholder="Buscar serviço para adicionar ao pacote…"
          />

          {itens.length === 0 ? (
            <p className="text-[12px] text-slate-400 dark:text-slate-500 py-2">Nenhum serviço adicionado ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {itens.map((it) => (
                <div key={it.servicoId} className="px-3 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">{it.nome}</p>
                    <p className="text-[11px] text-slate-400">{it.categoria}</p>
                  </div>
                  <div className="w-14">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Qtd</label>
                    <input type="number" min="1" step="1" value={it.quantidade}
                      onChange={(e) => updateItem(it.servicoId, 'quantidade', parseInt(e.target.value) || 1)}
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Preço R$</label>
                    <input type="number" min="0" step="0.01" value={it.preco}
                      onChange={(e) => updateItem(it.servicoId, 'preco', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button type="button" onClick={() => removeItem(it.servicoId)} className="text-slate-300 hover:text-red-500 shrink-0 mt-4">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-500">Preço total do pacote</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{fmtBRL(total)}</span>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" loading={saving}>{isEdit ? 'Salvar alterações' : 'Criar pacote'}</Button>
        </div>
      </form>
    </Drawer>
  )
}
