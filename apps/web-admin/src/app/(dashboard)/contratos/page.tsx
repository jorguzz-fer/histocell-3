'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileSignature, Plus, AlertTriangle, RefreshCw, RotateCw, Ban, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ClienteAvatar } from '@/components/ui/ClienteAvatar'
import { api } from '@/lib/api'
import { ContratoDrawer } from './ContratoDrawer'
import type { Contrato } from './types'

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataFmt(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}
function nomeCliente(c: Contrato) {
  return c.cliente.nomeFantasia || c.cliente.nome
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editando, setEditando] = useState<Contrato | null>(null)

  const carregar = useCallback(() => {
    setLoading(true)
    api.get<Contrato[]>('/contratos')
      .then(setContratos)
      .catch(() => toast.error('Erro ao carregar contratos'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function renovar(c: Contrato) {
    try {
      await api.patch(`/contratos/${c.id}/renovar`, {})
      toast.success(`Contrato de ${nomeCliente(c)} renovado.`)
      carregar()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao renovar')
    }
  }
  async function cancelar(c: Contrato) {
    if (!window.confirm(`Encerrar o contrato de ${nomeCliente(c)}?`)) return
    try {
      await api.patch(`/contratos/${c.id}/cancelar`, {})
      toast.success('Contrato encerrado.')
      carregar()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao encerrar')
    }
  }

  // "A vencer": ativos vencendo em até 30 dias (ou já vencidos).
  const aVencer = contratos.filter((c) => c.ativo && c.diasParaVencer <= 30)

  function novo() { setEditando(null); setDrawerOpen(true) }
  function editar(c: Contrato) { setEditando(c); setDrawerOpen(true) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle="Mensalidade fixa recorrente e alerta de renovação"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={carregar}><RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar</Button>
            <Button onClick={novo}><Plus className="h-4 w-4 mr-1.5" /> Novo contrato</Button>
          </div>
        }
      />

      {/* Aviso no painel — contratos a vencer */}
      {aVencer.length > 0 && (
        <section className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-amber-200 dark:border-amber-700/50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-400">Contratos a vencer (30 dias)</h2>
            <Badge variant="amber" className="ml-auto">{aVencer.length}</Badge>
          </div>
          <div className="divide-y divide-amber-200 dark:divide-amber-700/30">
            {aVencer.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClienteAvatar nome={nomeCliente(c)} seed={c.cliente.id} size={28} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">{nomeCliente(c)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {brl(c.valorMensal)}/mês · vence {dataFmt(c.dataFim)}{' '}
                      {c.vencido ? <span className="text-rose-600 font-semibold">(vencido)</span> : <span>({c.diasParaVencer} dia{c.diasParaVencer !== 1 ? 's' : ''})</span>}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => renovar(c)}><RotateCw className="h-3.5 w-3.5 mr-1" /> Renovar</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lista completa */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Todos os contratos</h2>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-[13px] text-slate-400">Carregando…</p>
        ) : contratos.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-slate-400">Nenhum contrato cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="px-4 py-2 font-medium text-right">Mensal</th>
                  <th className="px-4 py-2 font-medium text-center">Dia</th>
                  <th className="px-4 py-2 font-medium">Início</th>
                  <th className="px-4 py-2 font-medium">Vence</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contratos.map((c) => (
                  <tr key={c.id} className={`text-slate-700 dark:text-slate-200 ${!c.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <ClienteAvatar nome={nomeCliente(c)} seed={c.cliente.id} size={24} />
                        <span className="truncate">{nomeCliente(c)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{brl(c.valorMensal)}</td>
                    <td className="px-4 py-2 text-center tabular-nums">{c.diaCobranca}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{dataFmt(c.dataInicio)}</td>
                    <td className="px-4 py-2">{dataFmt(c.dataFim)}</td>
                    <td className="px-4 py-2">
                      {!c.ativo ? (
                        <Badge variant="slate">Encerrado</Badge>
                      ) : c.vencido ? (
                        <Badge variant="rose">Vencido</Badge>
                      ) : c.diasParaVencer <= 30 ? (
                        <Badge variant="amber">Vence em {c.diasParaVencer}d</Badge>
                      ) : (
                        <Badge variant="green">Ativo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {c.ativo && (
                          <button onClick={() => renovar(c)} title="Renovar" className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded">
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => editar(c)} title="Editar" className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {c.ativo && (
                          <button onClick={() => cancelar(c)} title="Encerrar" className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded">
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContratoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        contrato={editando}
        onSaved={carregar}
      />
    </div>
  )
}
