'use client'

import { useEffect, useState } from 'react'
import { Link2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { codigoCurtoPedido } from '@/lib/pedido'
import type { EntradaAvulsa } from '@/app/(dashboard)/entrada/types'

type PedidoOpcao = { id: number; numero: string; seq: number | null; status: string; createdAt: string }
type PedidoListResponse = { data: PedidoOpcao[] }

interface Props {
  open: boolean
  onClose: () => void
  /** Volumes pendentes de um mesmo cliente. */
  entradas: EntradaAvulsa[]
  onSaved: () => void
}

/**
 * Liga volumes que entraram avulsos (tela Entrada) ao orçamento/pedido do
 * cliente, quando ele finalmente existe. Só lista pedidos do mesmo cliente — a
 * API recusa vincular material de um cliente ao pedido de outro.
 */
export function VincularEntradaDrawer({ open, onClose, entradas, onSaved }: Props) {
  const [pedidos, setPedidos] = useState<PedidoOpcao[]>([])
  const [pedidoId, setPedidoId] = useState<number | null>(null)
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const clienteId = entradas[0]?.clienteId ?? null
  const clienteLabel = entradas[0]?.clienteNomeFantasia ?? entradas[0]?.clienteNome ?? ''

  useEffect(() => {
    if (!open || clienteId == null) return
    setSelecionados(entradas.map((e) => e.id))
    setPedidoId(null)
    setCarregando(true)
    api
      .get<PedidoListResponse>(`/pedidos?clienteId=${clienteId}&limit=30`)
      .then((res) => setPedidos(res.data))
      .catch((e) => toast.error(e.message ?? 'Erro ao carregar pedidos'))
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clienteId])

  function alternar(id: number) {
    setSelecionados((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function vincular() {
    if (pedidoId == null) {
      toast.error('Escolha o pedido/orçamento.')
      return
    }
    if (selecionados.length === 0) {
      toast.error('Selecione ao menos um volume.')
      return
    }
    setSalvando(true)
    try {
      const res = await api.post<{ message: string }>('/recebimento/entradas/vincular', {
        recipienteIds: selecionados,
        pedidoId,
      })
      toast.success(res.message)
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao vincular')
    } finally {
      setSalvando(false)
    }
  }

  if (entradas.length === 0) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vincular entrada a um orçamento"
      subtitle={clienteLabel} width="max-w-xl"
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
          Estes volumes chegaram <strong>antes do orçamento</strong>. Ao vincular, eles passam a
          pertencer ao pedido e seguem o fluxo normal do Recebimento.
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Volumes ({selecionados.length}/{entradas.length})
            </h3>
          </div>
          <div className="space-y-1">
            {entradas.map((e) => (
              <label
                key={e.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
              >
                <input
                  type="checkbox"
                  checked={selecionados.includes(e.id)}
                  onChange={() => alternar(e.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[13px] text-slate-700 dark:text-slate-200">{e.tipo}</span>
                <span className="font-mono text-[12px] text-slate-400">{e.codigo}</span>
                {e.observacoes && (
                  <span className="truncate text-[11px] text-slate-400">· {e.observacoes}</span>
                )}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-slate-400" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Pedido / orçamento do cliente
            </h3>
          </div>

          {carregando ? (
            <p className="py-4 text-center text-[12px] text-slate-400">Carregando…</p>
          ) : pedidos.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 py-6 text-center text-[12px] text-slate-400 dark:border-slate-700">
              Este cliente ainda não tem pedido. Crie o orçamento primeiro.
            </p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-auto">
              {pedidos.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 ${
                    pedidoId === p.id
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="pedido"
                    checked={pedidoId === p.id}
                    onChange={() => setPedidoId(p.id)}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-mono text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                    {codigoCurtoPedido(p.seq, p.numero)}
                  </span>
                  <span className="text-[12px] text-slate-500">{p.status}</span>
                  <span className="ml-auto text-[11px] text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={vincular} loading={salvando} disabled={pedidos.length === 0}>
            Vincular
          </Button>
        </div>
      </div>
    </Modal>
  )
}
