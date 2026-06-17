'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Printer, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { EtiquetaPrintArea } from '../EtiquetaPrintArea'
import type {
  Etiqueta,
  GerarLoteResponse,
  LinhaConferencia,
  PrepararPedidoResponse,
  TipoEtiqueta,
} from '../types'

const TIPO_OPTS: { value: TipoEtiqueta; label: string }[] = [
  { value: 'lamina', label: 'Lâmina' },
  { value: 'cassete', label: 'Cassete' },
  { value: 'bloco', label: 'Bloco' },
]

const cellInput =
  'w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[13px] ' +
  'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors'

function ConferenciaPedido() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pedidoId = searchParams.get('pedido')

  const [pedido, setPedido] = useState<PrepararPedidoResponse['pedido'] | null>(null)
  const [linhas, setLinhas] = useState<LinhaConferencia[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [printList, setPrintList] = useState<Etiqueta[]>([])

  const carregar = useCallback(async () => {
    if (!pedidoId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.post<PrepararPedidoResponse>('/etiquetas/preparar-pedido', {
        pedidoId: Number(pedidoId),
      })
      setPedido(res.pedido)
      setLinhas(res.linhas)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao preparar etiquetas do pedido')
    } finally {
      setLoading(false)
    }
  }, [pedidoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  function atualizar(
    index: number,
    campo: 'identificacao' | 'coloracao' | 'tipo' | 'quantidade',
    valor: string,
  ) {
    setLinhas((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l
        if (campo === 'quantidade') {
          const q = parseInt(valor, 10)
          return { ...l, quantidade: Number.isFinite(q) && q >= 0 ? Math.min(200, q) : 0 }
        }
        if (campo === 'tipo') return { ...l, tipo: valor as TipoEtiqueta }
        return { ...l, [campo]: valor }
      }),
    )
  }

  const totalEtiquetas = linhas.reduce((s, l) => s + l.quantidade, 0)

  async function gerar(imprimir: boolean) {
    const payload = linhas
      .filter((l) => l.quantidade > 0)
      .map((l) => ({
        amostraId: l.amostraId,
        tipo: l.tipo,
        quantidade: l.quantidade,
        coloracao: l.coloracao.trim() || undefined,
        identificacao: l.identificacao.trim() || undefined,
      }))

    if (payload.length === 0) {
      toast.error('Nenhuma etiqueta a gerar. Ajuste as quantidades.')
      return
    }

    setSaving(true)
    try {
      const res = await api.post<GerarLoteResponse>('/etiquetas/gerar-lote', { linhas: payload })
      const etiquetas = res.etiquetas ?? []
      toast.success(res.message ?? `${etiquetas.length} etiqueta(s) gerada(s).`)

      if (imprimir && etiquetas.length > 0) {
        setPrintList(etiquetas)
        await new Promise((r) => setTimeout(r, 400))
        window.print()
        try {
          await api.post('/etiquetas/imprimir', { ids: etiquetas.map((e) => e.id) })
        } catch {
          /* impressão pode ter sido cancelada — silencioso */
        }
        setPrintList([])
      }
      router.push('/etiquetas')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao gerar etiquetas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conferência de etiquetas"
        subtitle={
          pedido
            ? `Pedido ${pedido.numero} · ${pedido.clienteNome}`
            : 'Revise e edite os dados antes de imprimir'
        }
        action={
          <Button variant="secondary" onClick={() => router.push('/etiquetas')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Etiquetas
          </Button>
        }
      />

      {!pedidoId ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card py-16 text-center">
          <Tags className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum pedido informado.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : linhas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card py-16 text-center">
          <Tags className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Este pedido não tem itens para etiquetar.</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                  <tr>
                    {['Nº Histocell', 'Serviço', 'Identificação', 'Coloração', 'Tipo', 'Qtd'].map((h) => (
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
                  {linhas.map((l, i) => (
                    <tr key={l.amostraId} className="align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-[12px] font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {l.numeroInterno}
                        </div>
                        {l.jaGeradas > 0 && (
                          <div className="text-[10px] text-amber-500 mt-0.5">
                            {l.jaGeradas} já gerada(s)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[12px] text-slate-700 dark:text-slate-300 max-w-[220px]">
                          {l.servicoNome}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{l.servicoCodigo}</div>
                      </td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <input
                          className={cellInput}
                          value={l.identificacao}
                          onChange={(e) => atualizar(i, 'identificacao', e.target.value)}
                          placeholder="ex: PatoVetLab-DF/01 /M10"
                        />
                      </td>
                      <td className="px-4 py-3 w-32">
                        <input
                          className={cellInput}
                          value={l.coloracao}
                          onChange={(e) => atualizar(i, 'coloracao', e.target.value)}
                          placeholder="ex: .HE"
                        />
                      </td>
                      <td className="px-4 py-3 w-32">
                        <select
                          className={cellInput}
                          value={l.tipo}
                          onChange={(e) => atualizar(i, 'tipo', e.target.value)}
                        >
                          {TIPO_OPTS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 w-20">
                        <input
                          type="number"
                          min={0}
                          max={200}
                          className={cellInput}
                          value={l.quantidade}
                          onChange={(e) => atualizar(i, 'quantidade', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-500 dark:text-slate-400">
              Total: <Badge variant="blue">{totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''}</Badge>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => gerar(false)} loading={saving} disabled={totalEtiquetas === 0}>
                Apenas gerar
              </Button>
              <Button onClick={() => gerar(true)} loading={saving} disabled={totalEtiquetas === 0}>
                <Printer className="h-4 w-4 mr-1.5" />
                Gerar e imprimir
              </Button>
            </div>
          </div>
        </>
      )}

      <EtiquetaPrintArea etiquetas={printList} />
    </div>
  )
}

export default function ConferenciaPage() {
  return (
    <Suspense fallback={null}>
      <ConferenciaPedido />
    </Suspense>
  )
}
