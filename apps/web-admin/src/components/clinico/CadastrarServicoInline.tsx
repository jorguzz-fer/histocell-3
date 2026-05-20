'use client'

import { useState } from 'react'
import { Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { ResolvedClinical } from '@/lib/clinica/types'

const CATEGORIAS = [
  'Macroscopia','Processamento','Criostato','Cortes Histológico','Cortes Eppendorf',
  'Colorações','Coloração Específica','Imunohistoquímica','Imunofluorescência',
  'Citologia','Análises','Laudos','Imagem','Outros',
  'Descarte/Devolução','IPOG','Insumos/Materiais','Anticorpo','Logística',
  'Consultoria/Serviços','Manutenção',
].map((v) => ({ value: v, label: v }))

interface Props {
  item: ResolvedClinical
  onClose: () => void
  onCriado: (s: Servico) => void
}

export function CadastrarServicoInline({ item, onClose, onCriado }: Props) {
  const [nome, setNome]                   = useState(item.clinicalName)
  const [categoria, setCategoria]         = useState(item.suggested.categoria || 'Outros')
  const [precoRotina, setPrecoRotina]     = useState(String(item.suggested.precoRotina ?? ''))
  const [precoPesquisa, setPrecoPesquisa] = useState(String(item.suggested.precoPesquisa ?? ''))
  const [saving, setSaving]               = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !precoRotina) {
      toast.error('Nome e preço rotina são obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const rot = parseFloat(precoRotina)
      const pes = parseFloat(precoPesquisa) || rot
      const novo = await api.post<Servico>('/pedidos/servicos/novo', {
        codigo: `CUSTOM-${Date.now()}`,
        categoria,
        nome: nome.trim(),
        precoBase: rot,
        precoRotina: rot,
        precoPesquisa: pes,
      })
      toast.success('Serviço criado e adicionado ao pedido!')
      onCriado(novo)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao criar serviço')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            Cadastrar serviço clínico
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <strong>{item.clinicalName}</strong> (cód. clínico {item.codigo}) não consta no catálogo.
          Cadastre agora — será adicionado ao pedido e ficará disponível para futuros.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nome do serviço *" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={CATEGORIAS} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço Rotina (R$) *"
              type="number" min="0" step="0.01"
              value={precoRotina} onChange={(e) => setPrecoRotina(e.target.value)}
              placeholder="0,00"
            />
            <Input
              label="Preço Pesquisa (R$)"
              type="number" min="0" step="0.01"
              value={precoPesquisa} onChange={(e) => setPrecoPesquisa(e.target.value)}
              placeholder="= rotina"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>Cadastrar e adicionar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
