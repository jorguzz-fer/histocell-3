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

type TipoPreco = 'fixo' | 'desconto'

type ItemForm = {
  servicoId: number
  nome: string
  categoria: string
  quantidade: number
  preco: number        // preço fixo (modo 'fixo')
  descontoPct: number  // % desconto sobre a tabela (modo 'desconto')
  precoRotina: number  // referência (tabela de rotina do serviço)
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
  const [tipoPreco, setTipoPreco] = useState<TipoPreco>('fixo')
  const [itens, setItens] = useState<ItemForm[]>([])
  const [pick, setPick] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (pacote) {
      setCodigo(pacote.codigo)
      setNome(pacote.nome)
      setDescricao(pacote.descricao ?? '')
      setTipoPreco(pacote.tipoPreco ?? 'fixo')
      setItens(pacote.itens.map((it) => ({
        servicoId: it.servicoId,
        nome: it.servico.nome,
        categoria: it.servico.categoria,
        quantidade: it.quantidade,
        preco: Number(it.preco),
        descontoPct: Number(it.descontoPct ?? 0),
        precoRotina: Number(it.precoTabela ?? it.servico.precoRotina ?? 0),
      })))
    } else {
      setCodigo(''); setNome(''); setDescricao(''); setTipoPreco('fixo'); setItens([])
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
      quantidade: 1,
      preco: Number(s.precoRotina || s.precoBase),
      descontoPct: 0,
      precoRotina: Number(s.precoRotina || s.precoBase),
    }])
    setPick('')
  }

  function updateItem(servicoId: number, field: 'quantidade' | 'preco' | 'descontoPct', value: number) {
    setItens((prev) => prev.map((it) => (it.servicoId === servicoId ? { ...it, [field]: value } : it)))
  }

  function removeItem(servicoId: number) {
    setItens((prev) => prev.filter((it) => it.servicoId !== servicoId))
  }

  // preço unitário efetivo de cada item conforme o modo
  const precoUnit = (it: ItemForm) =>
    tipoPreco === 'desconto'
      ? Math.round(it.precoRotina * (1 - it.descontoPct / 100) * 100) / 100
      : it.preco
  const total = itens.reduce((s, it) => s + precoUnit(it) * it.quantidade, 0)

  // Alerta de colisão: o código do pacote já é usado por um serviço (código ou código legado).
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
    if (!nome.trim()) { toast.error('Informe o nome'); return }
    if (itens.length === 0) { toast.error('Adicione ao menos um serviço'); return }

    setSaving(true)
    try {
      const payload = {
        codigo: codigo.trim() || undefined, // vazio → backend gera PCT-NNN exclusivo
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        tipoPreco,
        itens: itens.map((it) => ({
          servicoId: it.servicoId,
          quantidade: it.quantidade,
          preco: tipoPreco === 'fixo' ? it.preco : 0,
          descontoPct: tipoPreco === 'desconto' ? it.descontoPct : 0,
        })),
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
      subtitle={isEdit ? `#${pacote?.id} — ${pacote?.nome}` : 'Combo de serviços'}
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder={isEdit ? '' : 'auto (PCT-…)'} />
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

        {/* Modo de preço */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Como precificar</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipoPreco('fixo')}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                tipoPreco === 'fixo'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Preço fixo</p>
              <p className="text-[11px] text-slate-400">Valor fechado do combo</p>
            </button>
            <button
              type="button"
              onClick={() => setTipoPreco('desconto')}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                tipoPreco === 'desconto'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Desconto s/ tabela</p>
              <p className="text-[11px] text-slate-400">% sobre o preço do cliente</p>
            </button>
          </div>
        </div>

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
                    <p className="text-[11px] text-slate-400">
                      {it.categoria}
                      {tipoPreco === 'desconto' && (
                        <> · tabela {fmtBRL(it.precoRotina)} → <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtBRL(precoUnit(it))}</span></>
                      )}
                    </p>
                  </div>
                  <div className="w-14">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Qtd</label>
                    <input type="number" min="1" step="1" value={it.quantidade}
                      onChange={(e) => updateItem(it.servicoId, 'quantidade', parseInt(e.target.value) || 1)}
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {tipoPreco === 'fixo' ? (
                    <div className="w-20">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Preço R$</label>
                      <input type="number" min="0" step="0.01" value={it.preco}
                        onChange={(e) => updateItem(it.servicoId, 'preco', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ) : (
                    <div className="w-20">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Desc. %</label>
                      <input type="number" min="0" max="100" step="1" value={it.descontoPct}
                        onChange={(e) => updateItem(it.servicoId, 'descontoPct', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  <button type="button" onClick={() => removeItem(it.servicoId)} className="text-slate-300 hover:text-red-500 shrink-0 mt-4">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-500">
              {tipoPreco === 'desconto' ? 'Total estimado (tabela rotina)' : 'Preço total do pacote'}
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{fmtBRL(total)}</span>
          </div>
          {tipoPreco === 'desconto' && (
            <p className="text-[11px] text-slate-400">
              No pedido, o preço é recalculado pela tabela de cada cliente com esse desconto.
            </p>
          )}
        </section>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" loading={saving}>{isEdit ? 'Salvar alterações' : 'Criar pacote'}</Button>
        </div>
      </form>
    </Drawer>
  )
}
