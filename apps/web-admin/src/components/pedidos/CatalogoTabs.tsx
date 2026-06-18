'use client'

import { useState, useEffect, type ReactNode } from 'react'
import {
  Flame, Star, Clock, GitBranch, Plus, Archive, Boxes, Stethoscope, FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { CascadingServicoSelector } from '@/components/ui/CascadingServicoSelector'
import { ClinicoTab } from '@/components/clinico/ClinicoTab'
import { api } from '@/lib/api'
import { fmtBRL } from '@/hooks/useOrderCart'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { Pacote } from '@/app/(dashboard)/pacotes/types'

// ─── ServicoCard (Populares / Favoritos / Histórico) ─────────────────────────

interface CardProps {
  servico: Servico & { totalUsos?: number; ultimoPedidoEm?: string; favoritado?: boolean }
  isPesquisador: boolean
  onAdd: () => void
  onFav?: () => void
  onArchive?: () => void
  isFav?: boolean
}

function ServicoCard({ servico, isPesquisador, onAdd, onFav, onArchive, isFav }: CardProps) {
  const preco = isPesquisador ? servico.precoPesquisa : servico.precoRotina
  return (
    <div className="relative flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group">
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {onFav && (
          <button
            onClick={(e) => { e.stopPropagation(); onFav() }}
            className={`transition-colors ${isFav ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400'}`}
            title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Star className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
          </button>
        )}
        {onArchive && (
          <button
            onClick={(e) => { e.stopPropagation(); onArchive() }}
            className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Arquivar serviço (tirar da lista)"
          >
            <Archive className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="pr-12">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight line-clamp-2">
          {servico.nome}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{servico.categoria}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{fmtBRL(Number(preco))}</p>
          {servico.totalUsos != null && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{servico.totalUsos}× pedido</p>
          )}
          {servico.ultimoPedidoEm && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Último: {new Date(servico.ultimoPedidoEm).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  )
}

// ─── CatalogoTabs ────────────────────────────────────────────────────────────

type ClienteInfo = { nome: string; nomeFantasia?: string | null }

interface Props {
  clienteId: string
  isPesquisador: boolean
  cliente?: ClienteInfo
  onAdd: (s: Servico) => void
  addItemDireto: (args: {
    servicoId: number; nome: string; categoria: string; preco: number; quantidade?: number
  }) => void
  /** Conteúdo da aba "Legado" (catálogo completo). Quando informado, adiciona a aba. */
  legadoSlot?: ReactNode
  defaultTab?: string
}

export function CatalogoTabs({
  clienteId, isPesquisador, cliente, onAdd, addItemDireto, legadoSlot, defaultTab,
}: Props) {
  const [populares, setPopulares] = useState<(Servico & { totalUsos?: number })[]>([])
  const [favoritos, setFavoritos] = useState<(Servico & { favoritado?: boolean })[]>([])
  const [historico, setHistorico] = useState<(Servico & { ultimoPedidoEm?: string })[]>([])
  const [allServicos, setAllServicos] = useState<Servico[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [favIds, setFavIds] = useState<Set<number>>(new Set())
  const [pacoteBusca, setPacoteBusca] = useState('')
  const [pacoteCat, setPacoteCat] = useState('')

  const tabs = [
    { key: 'populares', label: 'Populares', icon: Flame },
    { key: 'favoritos', label: 'Favoritos', icon: Star },
    { key: 'historico', label: 'Histórico', icon: Clock },
    { key: 'pacotes', label: 'Pacotes', icon: Boxes },
    { key: 'guiado', label: 'Guiado', icon: GitBranch },
    { key: 'clinico', label: 'Clínico', icon: Stethoscope },
    ...(legadoSlot ? [{ key: 'legado', label: 'Legado', icon: FileSpreadsheet }] : []),
  ] as { key: string; label: string; icon: React.ElementType }[]

  const [tab, setTab] = useState<string>(defaultTab ?? 'populares')

  useEffect(() => {
    Promise.all([
      api.get<(Servico & { totalUsos?: number })[]>('/pedidos/servicos/populares'),
      api.get<Servico[]>('/pedidos/servicos'),
    ]).then(([pop, all]) => {
      setPopulares(pop)
      setAllServicos(all)
    }).catch(() => toast.error('Erro ao carregar dados'))

    api.get<Servico[]>('/pedidos/servicos/favoritos')
      .then((favs) => {
        setFavoritos(favs)
        setFavIds(new Set(favs.map((f) => f.id)))
      })
      .catch(() => {})

    api.get<Pacote[]>('/pacotes').then(setPacotes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!clienteId) { setHistorico([]); return }
    api.get<(Servico & { ultimoPedidoEm?: string })[]>(
      `/pedidos/clientes/${clienteId}/historico-servicos`,
    ).then(setHistorico).catch(() => {})
  }, [clienteId])

  async function toggleFav(s: Servico) {
    try {
      const res = await api.post<{ favoritado: boolean }>(`/pedidos/servicos/${s.id}/favorito`, {})
      setFavIds((prev) => {
        const next = new Set(prev)
        if (res.favoritado) {
          next.add(s.id)
          setFavoritos((f) => [s, ...f.filter((x) => x.id !== s.id)])
        } else {
          next.delete(s.id)
          setFavoritos((f) => f.filter((x) => x.id !== s.id))
        }
        return next
      })
      toast.success(res.favoritado ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
    } catch {
      toast.error('Erro ao atualizar favorito')
    }
  }

  async function archiveServico(s: Servico) {
    if (!confirm(`Arquivar "${s.nome}"? Ele sai das listas mas pode ser reativado na aba Legado.`)) return
    try {
      await api.patch(`/pedidos/servicos/${s.id}/arquivar`, { ativo: false })
      setPopulares((l) => l.filter((x) => x.id !== s.id))
      setFavoritos((l) => l.filter((x) => x.id !== s.id))
      setHistorico((l) => l.filter((x) => x.id !== s.id))
      setAllServicos((l) => l.filter((x) => x.id !== s.id))
      setFavIds((prev) => {
        const next = new Set(prev)
        next.delete(s.id)
        return next
      })
      toast.success(`"${s.nome}" arquivado`)
    } catch {
      toast.error('Erro ao arquivar serviço')
    }
  }

  function addPacote(p: Pacote) {
    p.itens.forEach((it) => addItemDireto({
      servicoId: it.servicoId,
      nome: it.servico.nome,
      categoria: it.servico.categoria,
      preco: Number(it.preco),
      quantidade: it.quantidade,
    }))
    toast.success(`Pacote "${p.nome}" adicionado (${p.totalItens} ${p.totalItens === 1 ? 'serviço' : 'serviços'})`)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-[13px] font-medium whitespace-nowrap transition-all border-b-2 ${
              tab === key
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {key === 'favoritos' && favIds.size > 0 && (
              <span className="ml-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {favIds.size}
              </span>
            )}
            {key === 'historico' && historico.length > 0 && (
              <span className="ml-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {historico.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="p-5">
        {tab === 'populares' && (
          <div className="space-y-3">
            {populares.length === 0 && allServicos.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <Flame className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                Sem histórico ainda — conforme os pedidos forem feitos, os mais usados aparecerão aqui.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(populares.length > 0 ? populares : allServicos.slice(0, 10)).map((s) => (
                <ServicoCard
                  key={s.id}
                  servico={s}
                  isPesquisador={isPesquisador}
                  onAdd={() => onAdd(s)}
                  onFav={() => toggleFav(s)}
                  onArchive={() => archiveServico(s)}
                  isFav={favIds.has(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'favoritos' && (
          <div>
            {favoritos.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Star className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum favorito ainda.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Clique na ★ em qualquer serviço para favoritar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {favoritos.map((s) => (
                  <ServicoCard
                    key={s.id}
                    servico={s}
                    isPesquisador={isPesquisador}
                    onAdd={() => onAdd(s)}
                    onFav={() => toggleFav(s)}
                    onArchive={() => archiveServico(s)}
                    isFav={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'historico' && (
          <div>
            {!clienteId ? (
              <div className="text-center py-8 space-y-2">
                <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Selecione um cliente para ver o histórico.
                </p>
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                Esse cliente ainda não tem pedidos anteriores.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                  Serviços que {cliente?.nomeFantasia ?? cliente?.nome} já pediu:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {historico.map((s) => (
                    <ServicoCard
                      key={s.id}
                      servico={s}
                      isPesquisador={isPesquisador}
                      onAdd={() => onAdd(s)}
                      onFav={() => toggleFav(s)}
                      onArchive={() => archiveServico(s)}
                      isFav={favIds.has(s.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'pacotes' && (() => {
          const cats = Array.from(new Set(pacotes.flatMap((p) => p.categorias ?? []))).sort()
          const q = pacoteBusca.trim().toLowerCase()
          const lista = pacotes.filter((p) => {
            if (pacoteCat && !(p.categorias ?? []).includes(pacoteCat)) return false
            if (!q) return true
            return p.codigo.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q)
          })
          return (
            <div className="space-y-3">
              {pacotes.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Boxes className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum pacote cadastrado.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Crie combos/painéis no menu <span className="font-medium">Pacotes</span>.
                  </p>
                </div>
              ) : (
                <>
                  <input
                    value={pacoteBusca}
                    onChange={(e) => setPacoteBusca(e.target.value)}
                    placeholder="Buscar pacote por código ou nome…"
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px]
                      bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {cats.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setPacoteCat('')}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${!pacoteCat ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                      >Todas</button>
                      {cats.map((c) => (
                        <button
                          key={c}
                          onClick={() => setPacoteCat(c === pacoteCat ? '' : c)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${pacoteCat === c ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >{c}</button>
                      ))}
                    </div>
                  )}

                  {lista.length === 0 ? (
                    <p className="text-center text-[12px] text-slate-400 py-6">Nenhum pacote encontrado.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {lista.map((p) => (
                        <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">
                                <span className="font-mono text-slate-400 mr-1.5">{p.codigo}</span>{p.nome}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {p.itens.map((it) => (it.quantidade > 1 ? `${it.quantidade}× ` : '') + it.servico.nome).join(' + ')}
                              </p>
                              {(p.categorias ?? []).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {(p.categorias ?? []).map((c) => (
                                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">{c}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-base font-bold text-slate-800 dark:text-slate-100">{fmtBRL(p.precoTotal)}</p>
                              <p className="text-[10px] text-slate-400">{p.totalItens} serviços</p>
                            </div>
                          </div>
                          <button
                            onClick={() => addPacote(p)}
                            className="mt-3 w-full flex items-center justify-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" /> Adicionar pacote
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {tab === 'guiado' && (
          <CascadingServicoSelector isPesquisador={isPesquisador} onSelect={onAdd} />
        )}

        {tab === 'clinico' && (
          <ClinicoTab
            servicos={allServicos}
            onSelect={onAdd}
            onServicoCriado={(s) => setAllServicos((prev) => [s, ...prev])}
          />
        )}

        {tab === 'legado' && legadoSlot}
      </div>
    </div>
  )
}
