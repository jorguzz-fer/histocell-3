'use client'

import { useState } from 'react'
import { Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'

const CATEGORIAS = [
  'Macroscopia','Processamento','Criostato','Cortes Histológico','Cortes Eppendorf',
  'Colorações','Coloração Específica','Imunohistoquímica','Imunofluorescência',
  'Citologia','Análises','Laudos','Imagem','Outros',
  'Descarte/Devolução','IPOG','Insumos/Materiais','Anticorpo','Logística',
  'Consultoria/Serviços','Manutenção',
].map((v) => ({ value: v, label: v }))

interface Props {
  /** serviço a editar; ausente = modo criar */
  servico?: Servico
  /** nome inicial sugerido no modo criar */
  initialNome?: string
  onClose: () => void
  onSaved: (s: Servico) => void
}

export function ServicoFormModal({ servico, initialNome, onClose, onSaved }: Props) {
  const editing = !!servico
  const [nome, setNome]                   = useState(servico?.nome ?? initialNome ?? '')
  const [categoria, setCategoria]         = useState(servico?.categoria ?? 'Outros')
  const [codigo, setCodigo]               = useState(servico?.codigo ?? '')
  const [precoRotina, setPrecoRotina]     = useState(String(servico?.precoRotina ?? ''))
  const [precoPesquisa, setPrecoPesquisa] = useState(String(servico?.precoPesquisa ?? ''))
  const [observacoes, setObservacoes]     = useState(servico?.observacoes ?? '')
  const [geraEtiqueta, setGeraEtiqueta]   = useState(servico?.geraEtiqueta ?? false)
  const [v1, setV1] = useState(servico?.variante1 ?? '')
  const [v2, setV2] = useState(servico?.variante2 ?? '')
  const [v3, setV3] = useState(servico?.variante3 ?? '')
  const [v4, setV4] = useState(servico?.variante4 ?? '')
  const [v5, setV5] = useState(servico?.variante5 ?? '')
  const [geraEtiqueta, setGeraEtiqueta] = useState(servico?.geraEtiqueta ?? true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !precoRotina) {
      toast.error('Nome e preço rotina são obrigatórios.')
      return
    }
    setSaving(true)
    const rot = parseFloat(precoRotina)
    const pes = parseFloat(precoPesquisa) || rot
    try {
      let saved: Servico
      if (editing) {
        saved = await api.patch<Servico>(`/pedidos/servicos/${servico!.id}`, {
          nome: nome.trim(), categoria, codigo: codigo.trim() || undefined,
          precoRotina: rot, precoPesquisa: pes, observacoes: observacoes || undefined,
          geraEtiqueta,
          variante1: v1 || undefined, variante2: v2 || undefined, variante3: v3 || undefined,
          variante4: v4 || undefined, variante5: v5 || undefined,
        })
        toast.success('Serviço atualizado!')
      } else {
        saved = await api.post<Servico>('/pedidos/servicos/novo', {
          codigo: codigo.trim() || undefined, // vazio → backend gera o próximo número livre
          categoria, nome: nome.trim(),
          precoBase: rot, precoRotina: rot, precoPesquisa: pes,
          observacoes: observacoes || undefined,
          geraEtiqueta,
          variante1: v1 || undefined, variante2: v2 || undefined, variante3: v3 || undefined,
          variante4: v4 || undefined, variante5: v5 || undefined,
        })
        toast.success('Serviço criado!')
      }
      onSaved(saved)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar serviço')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            {editing ? 'Editar serviço' : 'Novo serviço'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Serviço Base (nome) *" value={nome} onChange={(e) => setNome(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={CATEGORIAS} />
            {editing ? (
              <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            ) : (
              <Input
                label="Código"
                value=""
                disabled
                readOnly
                placeholder="Gerado automaticamente"
                hint="Próximo número livre, atribuído pelo sistema"
                className="cursor-not-allowed bg-slate-50 dark:bg-slate-900 text-slate-400"
              />
            )}
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={geraEtiqueta}
              onChange={(e) => setGeraEtiqueta(e.target.checked)}
              className="rounded border-slate-300"
            />
            Gera etiqueta de lâmina/bloco?
          </label>
          <div className="grid grid-cols-5 gap-2">
            <Input label="Var 1" value={v1} onChange={(e) => setV1(e.target.value)} />
            <Input label="Var 2" value={v2} onChange={(e) => setV2(e.target.value)} />
            <Input label="Var 3" value={v3} onChange={(e) => setV3(e.target.value)} />
            <Input label="Var 4" value={v4} onChange={(e) => setV4(e.target.value)} />
            <Input label="Var 5" value={v5} onChange={(e) => setV5(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor Rotina (R$) *" type="number" min="0" step="0.01" value={precoRotina} onChange={(e) => setPrecoRotina(e.target.value)} placeholder="0,00" />
            <Input label="Valor Pesquisa (R$)" type="number" min="0" step="0.01" value={precoPesquisa} onChange={(e) => setPrecoPesquisa(e.target.value)} placeholder="= rotina" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2">
            <input type="checkbox" checked={geraEtiqueta} onChange={(e) => setGeraEtiqueta(e.target.checked)} className="h-4 w-4 accent-blue-600" />
            <span className="text-[13px] text-slate-700 dark:text-slate-200">Gera etiqueta</span>
            <span className="text-[11px] text-slate-400">— desmarque para serviços que não etiquetam (ex.: caixa corta-lâmina)</span>
          </label>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
