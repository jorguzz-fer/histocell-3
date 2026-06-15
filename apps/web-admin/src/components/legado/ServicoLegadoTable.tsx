'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Search, Plus, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import { fmtBRL } from '@/hooks/useOrderCart'
import { ServicoFormModal } from './ServicoFormModal'

type ServicoRow = Servico & { ativo?: boolean }

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function variantes(s: Servico) {
  return [s.variante1, s.variante2, s.variante3, s.variante4, s.variante5].filter(Boolean).join(' · ')
}

interface Props {
  isPesquisador: boolean
  onAdd: (s: Servico) => void | Promise<void>
}

export function ServicoLegadoTable({ isPesquisador, onAdd }: Props) {
  const [servicos, setServicos]         = useState<ServicoRow[]>([])
  const [query, setQuery]               = useState('')
  const [categoria, setCategoria]       = useState('')
  const [showInativos, setShowInativos] = useState(false)
  const [editing, setEditing]           = useState<Servico | null>(null)
  const [creating, setCreating]         = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (showInativos) params.set('incluirInativos', 'true')
    const qs = params.toString()
    api.get<ServicoRow[]>(`/pedidos/servicos${qs ? '?' + qs : ''}`)
      .then(setServicos)
      .catch(() => toast.error('Erro ao carregar serviços'))
  }, [showInativos])

  useEffect(() => { load() }, [load])

  const categorias = useMemo(
    () => Array.from(new Set(servicos.map((s) => s.categoria))).sort(),
    [servicos],
  )

  const rows = useMemo(() => {
    const q = norm(query.trim())
    return servicos.filter((s) => {
      if (categoria && s.categoria !== categoria) return false
      if (!q) return true
      return norm(s.nome).includes(q) || s.codigo.toLowerCase().includes(q) ||
        (s.codigoLegado != null && String(s.codigoLegado).includes(q))
    })
  }, [servicos, query, categoria])

  async function arquivar(s: ServicoRow) {
    try {
      await api.patch(`/pedidos/servicos/${s.id}/arquivar`, { ativo: !(s.ativo ?? true) })
      toast.success((s.ativo ?? true) ? 'Serviço arquivado' : 'Serviço desarquivado')
      load()
    } catch (err: any) { toast.error(err.message ?? 'Erro ao arquivar') }
  }

  async function deletar(s: ServicoRow) {
    if (!confirm(`Deletar "${s.nome}"? Esta ação é permanente.`)) return
    try {
      await api.delete(`/pedidos/servicos/${s.id}`)
      toast.success('Serviço deletado')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Serviço em uso — arquive em vez de deletar')
    }
  }

  return (
    <div className="space-y-3">
      {/* Busca + ações */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código ou nome…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={showInativos} onChange={(e) => setShowInativos(e.target.checked)} />
          Mostrar arquivados
        </label>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium px-3 py-2"
        >
          <Plus className="h-3.5 w-3.5" /> Novo serviço
        </button>
      </div>

      {/* Pills de categoria */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategoria('')}
          className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full ${!categoria ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
        >Todas</button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoria(cat === categoria ? '' : cat)}
            className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full ${categoria === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >{cat}</button>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full table-fixed text-[12px]">
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Serviço Base</th>
                <th className="px-3 py-2 font-medium">Variantes</th>
                <th className="px-3 py-2 font-medium text-right">Rotina</th>
                <th className="px-3 py-2 font-medium text-right">Pesquisa</th>
                <th className="px-3 py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((s) => (
                <tr key={s.id} className={`align-top hover:bg-slate-50 dark:hover:bg-slate-800/50 ${s.ativo === false ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2 font-mono text-slate-500 break-words">{s.codigo}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 break-words">{s.categoria}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                    <span className="line-clamp-2 break-words" title={s.nome}>{s.nome}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    <span className="line-clamp-2 break-words" title={variantes(s)}>{variantes(s)}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtBRL(Number(s.precoRotina))}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtBRL(Number(s.precoPesquisa))}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onAdd(s)} title="Adicionar ao pedido" className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditing(s)} title="Editar" className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => arquivar(s)} title={s.ativo === false ? 'Desarquivar' : 'Arquivar'} className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded">
                        {s.ativo === false ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => deletar(s)} title="Deletar" className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    Nenhum serviço encontrado.
                    {query && (
                      <button onClick={() => setCreating(true)} className="ml-2 text-blue-600 font-medium hover:underline">
                        Criar &quot;{query}&quot;?
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ServicoFormModal servico={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
      {creating && (
        <ServicoFormModal initialNome={query} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />
      )}
    </div>
  )
}
