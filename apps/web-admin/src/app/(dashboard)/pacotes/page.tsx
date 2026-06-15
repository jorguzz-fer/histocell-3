'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, Boxes } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PacoteFormModal } from '@/components/pacotes/PacoteFormModal'
import { api } from '@/lib/api'
import { fmtBRL } from '@/hooks/useOrderCart'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { Pacote } from './types'

export default function PacotesPage() {
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [incluirInativos, setIncluirInativos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Pacote | null>(null)

  function carregar() {
    setLoading(true)
    api.get<Pacote[]>(`/pacotes?incluirInativos=${incluirInativos}`)
      .then(setPacotes)
      .catch(() => toast.error('Erro ao carregar pacotes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [incluirInativos])

  useEffect(() => {
    api.get<Servico[]>('/pedidos/servicos').then(setServicos).catch(() => {})
  }, [])

  function novo() { setEditing(null); setModalOpen(true) }
  function editar(p: Pacote) { setEditing(p); setModalOpen(true) }

  async function arquivar(p: Pacote) {
    try {
      await api.patch(`/pacotes/${p.id}/arquivar`, { ativo: !p.ativo })
      toast.success(p.ativo ? 'Pacote arquivado' : 'Pacote reativado')
      carregar()
    } catch { toast.error('Erro ao arquivar') }
  }

  async function deletar(p: Pacote) {
    if (!confirm(`Excluir o pacote "${p.nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.delete(`/pacotes/${p.id}`)
      toast.success('Pacote excluído')
      carregar()
    } catch (err: any) { toast.error(err.message ?? 'Erro ao excluir') }
  }

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pacotes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Combos de serviços com preço próprio — usados em 1 clique no Pedido Guiado
          </p>
        </div>
        <Button onClick={novo}><Plus className="h-4 w-4 mr-2" /> Novo pacote</Button>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400 cursor-pointer">
        <input type="checkbox" checked={incluirInativos} onChange={(e) => setIncluirInativos(e.target.checked)}
          className="rounded border-slate-300 dark:border-slate-600" />
        Mostrar arquivados
      </label>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Carregando…</p>
      ) : pacotes.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Boxes className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum pacote cadastrado ainda.</p>
          <Button variant="secondary" onClick={novo} className="mx-auto"><Plus className="h-4 w-4 mr-2" /> Criar o primeiro</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pacotes.map((p) => (
            <div key={p.id} className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 ${!p.ativo ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{p.codigo}</span>
                    {!p.ativo && <Badge variant="slate">arquivado</Badge>}
                  </div>
                  <p className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight mt-0.5">{p.nome}</p>
                  {p.descricao && <p className="text-[12px] text-slate-400 mt-0.5">{p.descricao}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => editar(p)} title="Editar" className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => arquivar(p)} title={p.ativo ? 'Arquivar' : 'Reativar'} className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                    {p.ativo ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                  </button>
                  <button onClick={() => deletar(p)} title="Excluir" className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ul className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                {p.itens.map((it) => (
                  <li key={it.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-600 dark:text-slate-300 truncate pr-2">
                      {it.quantidade > 1 && <span className="text-slate-400">{it.quantidade}× </span>}
                      {it.servico.nome}
                    </span>
                    <span className="text-slate-500 tabular-nums shrink-0">{fmtBRL(it.preco * it.quantidade)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-[12px] text-slate-400">{p.totalItens} serviço{p.totalItens !== 1 ? 's' : ''}</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{fmtBRL(p.precoTotal)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <PacoteFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pacote={editing}
        servicos={servicos}
        onSaved={carregar}
      />
    </div>
  )
}
