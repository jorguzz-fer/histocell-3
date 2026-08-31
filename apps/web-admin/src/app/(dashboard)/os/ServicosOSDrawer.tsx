'use client'

import { useCallback, useEffect, useState } from 'react'
import { FlaskConical, Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ServicoSearchInput } from '@/components/ui/ServicoSearchInput'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import { clienteDaOS, clienteIdDaOS, type ItemOS, type OrdemServico } from './types'

interface Props {
  open: boolean
  onClose: () => void
  os: OrdemServico | null
  onSaved: () => void
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Conferência do serviço da OS: é aqui que se decide o que será efetivamente
 * executado sobre o material que chegou. O orçamento, quando existe, é só a
 * estimativa anterior.
 */
export function ServicosOSDrawer({ open, onClose, os, onSaved }: Props) {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [itens, setItens] = useState<ItemOS[]>([])
  const [servicoId, setServicoId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregarItens = useCallback(async () => {
    if (!os) return
    setCarregando(true)
    try {
      setItens(await api.get<ItemOS[]>(`/ordens/${os.id}/itens`))
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao carregar serviços')
    } finally {
      setCarregando(false)
    }
  }, [os])

  useEffect(() => {
    if (!open || !os) return
    setServicoId('')
    setQuantidade('1')
    carregarItens()
    // O endpoint devolve o catálogo inteiro (array), sem paginação.
    api
      .get<Servico[]>('/pedidos/servicos')
      .then(setServicos)
      .catch(() => {})
  }, [open, os, carregarItens])

  async function adicionar() {
    if (!os || !servicoId) {
      toast.error('Escolha o serviço.')
      return
    }
    setSalvando(true)
    try {
      await api.post(`/ordens/${os.id}/itens`, {
        servicoId: Number(servicoId),
        quantidade: Math.max(1, parseInt(quantidade, 10) || 1),
      })
      setServicoId('')
      setQuantidade('1')
      await carregarItens()
      onSaved()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao adicionar serviço')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(itemId: number) {
    try {
      await api.delete(`/ordens/itens/${itemId}`)
      await carregarItens()
      onSaved()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao remover serviço')
    }
  }

  if (!os) return null

  const total = itens.reduce(
    (s, i) => s + i.preco * i.quantidade * (1 - i.desconto / 100),
    0,
  )
  const codigoCurto = os.seq != null ? `#${String(os.seq).padStart(4, '0')}` : os.numero
  const isPesquisador = false // preço já vem resolvido do backend; aqui é só exibição

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Serviços da OS ${codigoCurto}`}
      subtitle={clienteDaOS(os)} width="max-w-3xl" altura="cheia"
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
          Confira o material e registre <strong>o que será efetivamente feito</strong>. Esta lista é
          a da execução — o orçamento, quando existe, é só a estimativa anterior.
        </section>

        {/* Material que chegou */}
        {os.volumes.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Material recebido ({os.volumes.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {os.volumes.map((v) => (
                <span
                  key={v.id}
                  title={v.observacoes ?? undefined}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {v.tipo}
                  {v.condicao && (
                    <Badge variant={v.condicao === 'molhado' ? 'blue' : 'amber'}>{v.condicao}</Badge>
                  )}
                  <span className="font-mono text-slate-400">{v.codigo}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Adicionar serviço */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-slate-400" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Adicionar serviço
            </h3>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <ServicoSearchInput
                servicos={servicos}
                value={servicoId}
                onChange={(id) => setServicoId(id)}
                isPesquisador={isPesquisador}
              />
            </div>
            <div className="w-20">
              <Input
                label=""
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <Button onClick={adicionar} loading={salvando} disabled={!servicoId}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </section>

        {/* Serviços já confirmados */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Serviços a executar ({itens.length})
          </h3>
          {carregando ? (
            <p className="py-6 text-center text-[12px] text-slate-400">Carregando…</p>
          ) : itens.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 py-8 text-center text-[12px] text-slate-400 dark:border-slate-700">
              Nenhum serviço confirmado ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((i) => (
                <div key={i.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-slate-800 dark:text-slate-200">
                      <span className="font-mono text-slate-400">{i.servico.codigo}</span>{' '}
                      {i.servico.nome}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {i.quantidade} × {fmtBRL(i.preco)}
                      {i.desconto > 0 ? ` · −${i.desconto}%` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                    {fmtBRL(i.preco * i.quantidade * (1 - i.desconto / 100))}
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(i.id)}
                    className="shrink-0 p-1.5 text-slate-300 hover:text-rose-500"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
          <span className="text-[13px] text-slate-500">
            Total: <strong className="text-slate-800 dark:text-slate-200">{fmtBRL(total)}</strong>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
