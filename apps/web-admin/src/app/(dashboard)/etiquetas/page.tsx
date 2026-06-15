'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Tags, Plus, Printer, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import { GerarEtiquetasDrawer } from './GerarEtiquetasDrawer'
import { EtiquetaLabel } from './EtiquetaLabel'
import type { Etiqueta, EtiquetaListResponse } from './types'

const TIPO_LABEL: Record<string, string> = { lamina: 'Lâmina', cassete: 'Cassete', bloco: 'Bloco' }

const IMPRESSO_OPTS = [
  { value: '', label: 'Todas' },
  { value: 'false', label: 'Não impressas' },
  { value: 'true', label: 'Impressas' },
]

function fmtNumero(n: number) {
  return String(n).padStart(8, '0')
}

export default function EtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroImpresso, setFiltroImpresso] = useState('')
  const [page, setPage] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [printList, setPrintList] = useState<Etiqueta[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchEtiquetas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busca) params.set('busca', busca)
      if (filtroImpresso) params.set('impresso', filtroImpresso)
      params.set('page', String(page))
      params.set('limit', '50')
      const res = await api.get<EtiquetaListResponse>(`/etiquetas?${params}`)
      setEtiquetas(res.data)
      setMeta(res.meta)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar etiquetas')
    } finally {
      setLoading(false)
    }
  }, [busca, filtroImpresso, page])

  useEffect(() => { setPage(1) }, [busca, filtroImpresso])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchEtiquetas, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchEtiquetas])

  // ── seleção ───────────────────────────────────────────────────────────────────
  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === etiquetas.length ? new Set() : new Set(etiquetas.map((e) => e.id)),
    )
  }

  // ── impressão ─────────────────────────────────────────────────────────────────
  async function imprimir(lista: Etiqueta[]) {
    if (lista.length === 0) return
    setPrintList(lista)
    // espera o render dos códigos de barras antes de abrir o diálogo
    await new Promise((r) => setTimeout(r, 400))
    window.print()
    try {
      await api.post('/etiquetas/imprimir', { ids: lista.map((e) => e.id) })
    } catch {
      /* impressão pode ter sido cancelada — silencioso */
    }
    setPrintList([])
    setSelected(new Set())
    fetchEtiquetas()
  }

  async function remover(e: Etiqueta) {
    if (!confirm(`Remover a etiqueta ${fmtNumero(e.numero)}?`)) return
    try {
      await api.delete(`/etiquetas/${e.id}`)
      toast.success('Etiqueta removida.')
      fetchEtiquetas()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao remover etiqueta')
    }
  }

  const selecionadas = etiquetas.filter((e) => selected.has(e.id))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etiquetas"
        subtitle="Geração e impressão de etiquetas (Code128) por lâmina/cassete"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={fetchEtiquetas}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Atualizar
            </Button>
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Gerar etiquetas
            </Button>
          </div>
        }
      />

      {/* Filtros + ações de seleção */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por nº, código, identificação ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-72 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[13px]
            bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
        <div className="w-44">
          <Select
            value={filtroImpresso}
            onChange={(e) => setFiltroImpresso(e.target.value)}
            options={IMPRESSO_OPTS}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="secondary" onClick={() => imprimir(selecionadas)}>
              <Printer className="h-4 w-4 mr-1.5" />
              Imprimir selecionadas ({selected.size})
            </Button>
          )}
          <span className="text-[12px] text-slate-400">
            {meta.total} etiqueta{meta.total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : etiquetas.length === 0 ? (
          <div className="py-16 text-center">
            <Tags className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma etiqueta encontrada</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {busca || filtroImpresso ? 'Ajuste os filtros.' : 'Clique em "Gerar etiquetas" para começar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === etiquetas.length && etiquetas.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 dark:border-slate-600"
                    />
                  </th>
                  {['Nº', 'Identificação', 'Coloração', 'Tipo', 'Código', 'Amostra / Cliente', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {etiquetas.map((e) => {
                  const cli = e.amostra.pedido.cliente.nomeFantasia ?? e.amostra.pedido.cliente.nome
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(e.id)}
                          onChange={() => toggle(e.id)}
                          className="rounded border-slate-300 dark:border-slate-600"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[12px] font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {fmtNumero(e.numero)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-slate-700 dark:text-slate-300">
                          {e.identificacao ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                          {e.coloracao ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[12px] text-slate-600 dark:text-slate-400">
                          {TIPO_LABEL[e.tipo] ?? e.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {e.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[12px] font-mono text-slate-600 dark:text-slate-400">
                          {e.amostra.numeroInterno}
                        </div>
                        <div className="text-[12px] text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{cli}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {e.impresso ? (
                          <Badge variant="green">Impressa</Badge>
                        ) : (
                          <Badge variant="amber">Pendente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Imprimir"
                            onClick={() => imprimir([e])}
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50
                              dark:hover:bg-blue-500/10 transition-colors"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Remover"
                            onClick={() => remover(e)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50
                              dark:hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação simples */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-[12px] text-slate-400">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      <GerarEtiquetasDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onGenerated={fetchEtiquetas}
      />

      {/* Área de impressão (oculta em tela, visível só na impressão) */}
      <div className="etiqueta-print-area" aria-hidden>
        {printList.map((e) => (
          <EtiquetaLabel key={e.id} etiqueta={e} />
        ))}
      </div>

      <style>{`
        .etiqueta-print-area { display: none; }
        .etiqueta-label {
          box-sizing: border-box;
          width: 50mm;
          padding: 1mm 1.5mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.15;
          break-inside: avoid;
        }
        .etiqueta-ident { font-size: 7pt; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .etiqueta-coloracao { font-size: 10pt; font-weight: 700; }
        .etiqueta-barcode { width: 100%; height: auto; }
        .etiqueta-numero { font-family: 'Courier New', monospace; font-size: 8pt; }
        .etiqueta-histocell { font-size: 8pt; }
        @media print {
          body * { visibility: hidden; }
          .etiqueta-print-area, .etiqueta-print-area * { visibility: visible; }
          .etiqueta-print-area {
            display: flex !important;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 2mm;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page { margin: 8mm; }
        }
      `}</style>
    </div>
  )
}
