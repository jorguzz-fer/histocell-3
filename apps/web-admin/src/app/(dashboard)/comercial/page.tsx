'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, X, FileText, RefreshCw, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ClienteAvatar } from '@/components/ui/ClienteAvatar'
import { OSModal } from '@/components/OSModal'
import { fmtBRL } from '@/hooks/useOrderCart'
import { api } from '@/lib/api'

type Orcamento = {
  id: number
  numero: string
  codigoCurto?: string
  clienteId: number
  clienteNome: string
  clienteNomeFantasia?: string | null
  valorTotal: number
  totalItens: number
  aprovacaoCliente: 'pendente' | 'aprovado' | 'recusado' | 'dispensado'
  aprovadoClienteEm?: string | null
  createdAt: string
}

const FILTROS = [
  { key: 'pendente', label: 'Pendentes' },
  { key: 'aprovado', label: 'Aprovados' },
  { key: 'recusado', label: 'Recusados' },
  { key: '', label: 'Todos' },
] as const

const badgeAprovacao: Record<string, { label: string; variant: 'amber' | 'green' | 'rose' | 'slate' }> = {
  pendente: { label: 'Aguardando cliente', variant: 'amber' },
  aprovado: { label: 'Aprovado', variant: 'green' },
  recusado: { label: 'Recusado', variant: 'rose' },
}

function fmtData(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function ComercialPage() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['key']>('pendente')
  const [lista, setLista] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [osModal, setOsModal] = useState<{ pedidoId: number; numero: string } | null>(null)
  const [agindo, setAgindo] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const qs = filtro ? `?status=${filtro}` : ''
      setLista(await api.get<Orcamento[]>(`/pedidos/orcamentos/lista${qs}`))
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar orçamentos')
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { carregar() }, [carregar])

  async function decidir(o: Orcamento, decisao: 'aprovado' | 'recusado') {
    setAgindo(o.id)
    try {
      await api.patch(`/pedidos/${o.id}/orcamento-decisao`, { decisao })
      toast.success(
        decisao === 'aprovado'
          ? `Orçamento ${o.codigoCurto ?? o.numero} aprovado — liberado para a Recepção.`
          : `Orçamento ${o.codigoCurto ?? o.numero} recusado.`,
      )
      carregar()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar decisão')
    } finally {
      setAgindo(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orçamentos"
        subtitle="Orçamentos enviados para aprovação do cliente (aprovar libera o pedido para a Recepção)"
        action={
          <Button variant="secondary" onClick={carregar}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
          </Button>
        }
      />

      {/* Filtros */}
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[13px]">
        {FILTROS.map((f) => (
          <button
            key={f.key || 'todos'}
            onClick={() => setFiltro(f.key)}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              filtro === f.key
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
        {loading ? (
          <p className="py-16 text-center text-[13px] text-slate-400">Carregando…</p>
        ) : lista.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum orçamento {filtro && badgeAprovacao[filtro]?.label.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Nº</th>
                  <th className="px-4 py-2.5 font-semibold">Cliente</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Itens</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Valor</th>
                  <th className="px-4 py-2.5 font-semibold">Situação</th>
                  <th className="px-4 py-2.5 font-semibold">Criado</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lista.map((o) => {
                  const b = badgeAprovacao[o.aprovacaoCliente] ?? { label: o.aprovacaoCliente, variant: 'slate' as const }
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-200" title={o.numero}>
                        {o.codigoCurto ?? o.numero}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <ClienteAvatar nome={o.clienteNomeFantasia ?? o.clienteNome} seed={o.clienteId} size={24} />
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                            {o.clienteNomeFantasia ?? o.clienteNome}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-slate-500">{o.totalItens}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">{fmtBRL(o.valorTotal)}</td>
                      <td className="px-4 py-2.5"><Badge variant={b.variant}>{b.label}</Badge></td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtData(o.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setOsModal({ pedidoId: o.id, numero: o.codigoCurto ?? o.numero })}
                            title="Ver OS"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[12px] font-medium text-slate-500 hover:text-blue-600 hover:border-blue-300"
                          >
                            <Eye className="h-3.5 w-3.5" /> Ver
                          </button>
                          {o.aprovacaoCliente === 'pendente' && (
                            <>
                              <button
                                disabled={agindo === o.id}
                                onClick={() => decidir(o, 'aprovado')}
                                title="Aprovar orçamento"
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-500/40 px-2 py-1 text-[12px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" /> Aprovar
                              </button>
                              <button
                                disabled={agindo === o.id}
                                onClick={() => decidir(o, 'recusado')}
                                title="Recusar orçamento"
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 dark:border-rose-500/40 px-2 py-1 text-[12px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" /> Recusar
                              </button>
                            </>
                          )}
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

      <OSModal
        open={osModal != null}
        pedidoId={osModal?.pedidoId ?? null}
        osNumero={osModal?.numero}
        onClose={() => setOsModal(null)}
      />
    </div>
  )
}
