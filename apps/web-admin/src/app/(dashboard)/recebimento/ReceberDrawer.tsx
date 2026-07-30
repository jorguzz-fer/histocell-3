'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, FlaskConical, Package, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import type { PedidoFila, AmostraItemForm } from './types'

type Linha = AmostraItemForm & { _key: string }

function novaLinha(recipienteId: number | null): Linha {
  return {
    _key: Math.random().toString(36).slice(2),
    recipienteId,
    numeroCliente: '',
    especie: '',
    material: '',
    localizacao: '',
    observacoes: '',
  }
}

interface ReceberDrawerProps {
  open: boolean
  onClose: () => void
  pedido: PedidoFila | null
  onSaved: () => void
  /** Abre a impressão (Ordem de Serviço) num modal, sem nova aba. */
  onImprimir?: (url: string) => void
}

export function ReceberDrawer({ open, onClose, pedido, onSaved, onImprimir }: ReceberDrawerProps) {
  const [linhas, setLinhas] = useState<Linha[]>([])
  // Itens (serviços) editáveis: a quantidade pode ser ajustada aqui na
  // identificação e é salva no pedido (reflete na conferência/cobrança/etiquetas).
  const [itens, setItens] = useState<PedidoFila['itens']>([])
  const [previstaManual, setPrevistaManual] = useState(false)
  const [recebidoPor, setRecebidoPor] = useState('')
  const [qtdPrevista, setQtdPrevista] = useState('')
  const [qtdRecebida, setQtdRecebidaState] = useState('')
  const [recebidaManual, setRecebidaManual] = useState(false) // true quando o usuário digita a qtd recebida
  const [obsConferencia, setObsConferencia] = useState('')
  const [saving, setSaving] = useState(false)

  const recipientes = useMemo(() => pedido?.recipientes ?? [], [pedido])

  useEffect(() => {
    if (open && pedido) {
      // 1 amostra inicial por recipiente (ou 1 avulsa, se não houver recipientes)
      const inicial = recipientes.length
        ? recipientes.map((r) => novaLinha(r.id))
        : [novaLinha(null)]
      setLinhas(inicial)
      setItens(pedido.itens.map((it) => ({ ...it })))
      setPrevistaManual(false)
      setRecebidoPor('')
      const qtdItens = pedido.itens.reduce((s, it) => s + it.quantidade, 0)
      setQtdPrevista(String(qtdItens))
      setQtdRecebidaState(String(inicial.length))
      setRecebidaManual(false)
      setObsConferencia('')
    }
  }, [open, pedido, recipientes])

  // Recebendo: por padrão acompanha o nº de amostras cadastradas; depois que o
  // usuário digita, respeita o valor manual.
  useEffect(() => {
    if (!recebidaManual) setQtdRecebidaState(String(linhas.length))
  }, [linhas.length, recebidaManual])
  const setQtdRecebida = (v: string) => { setRecebidaManual(true); setQtdRecebidaState(v) }

  // Qtd prevista acompanha a soma dos itens (até o usuário digitar manualmente).
  useEffect(() => {
    if (!previstaManual && itens.length) {
      setQtdPrevista(String(itens.reduce((s, it) => s + it.quantidade, 0)))
    }
  }, [itens, previstaManual])

  function setItemQtd(itemId: number, valor: string) {
    const q = Math.max(1, parseInt(valor, 10) || 1)
    setItens((prev) => prev.map((it) => (it.id === itemId ? { ...it, quantidade: q } : it)))
  }
  async function salvarItemQtd(it: PedidoFila['itens'][number]) {
    try {
      await api.patch(`/pedidos/itens/${it.id}`, { quantidade: it.quantidade })
      onSaved()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao atualizar quantidade do serviço')
    }
  }

  const previstaNum = parseInt(qtdPrevista, 10)
  const recebidaNum = parseInt(qtdRecebida, 10)
  const diferenca =
    Number.isFinite(previstaNum) && Number.isFinite(recebidaNum) ? recebidaNum - previstaNum : 0

  function setLinha(key: string, field: keyof AmostraItemForm, value: string) {
    setLinhas((prev) => prev.map((l) => (l._key === key ? { ...l, [field]: value } : l)))
  }
  // Sugere o próximo número do cliente a partir da última linha preenchida
  // (do mesmo recipiente, se houver): incrementa o número final preservando o
  // prefixo. Ex.: "13" → "14"; "A26/123" → "A26/124"; "PH11" → "PH12".
  // É só uma sugestão — o campo continua editável (pode pular para 15, etc.).
  function sugerirNumeroCliente(prev: Linha[], recipienteId: number | null): string {
    const doRecipiente = prev.filter(
      (l) => l.numeroCliente.trim() !== '' && (recipienteId == null || l.recipienteId === recipienteId),
    )
    const candidatas = doRecipiente.length
      ? doRecipiente
      : prev.filter((l) => l.numeroCliente.trim() !== '')
    const base = candidatas[candidatas.length - 1]
    if (!base) return ''
    const m = base.numeroCliente.trim().match(/^(.*?)(\d+)(\D*)$/)
    if (!m) return ''
    const [, prefixo, dig, sufixo] = m
    const prox = String(Number(dig) + 1).padStart(dig.length, '0')
    return `${prefixo}${prox}${sufixo}`
  }
  function addLinha(recipienteId: number | null) {
    setLinhas((prev) => {
      const nova = novaLinha(recipienteId)
      nova.numeroCliente = sugerirNumeroCliente(prev, recipienteId)
      return [...prev, nova]
    })
  }
  function removeLinha(key: string) {
    setLinhas((prev) => prev.filter((l) => l._key !== key))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pedido) return
    if (linhas.length === 0) {
      toast.error('Adicione pelo menos uma amostra.')
      return
    }
    setSaving(true)
    try {
      const res = await api.post<{
        message?: string
        etiquetasGeradas?: number
        ordensFalhas?: number
        precisaAprovacao?: boolean
        credito?: { abatido: number; saldo: number } | null
      }>('/recebimento/receber', {
        pedidoId: pedido.id,
        recebidoPor: recebidoPor.trim() || undefined,
        qtdPrevista: Number.isFinite(previstaNum) ? previstaNum : undefined,
        qtdRecebida: Number.isFinite(recebidaNum) ? recebidaNum : undefined,
        observacaoConferencia: obsConferencia.trim() || undefined,
        amostras: linhas.map((a) => ({
          recipienteId: a.recipienteId ?? undefined,
          numeroCliente: a.numeroCliente.trim() || undefined,
          observacoes: a.observacoes.trim() || undefined,
        })),
      })

      if (res.precisaAprovacao) {
        // Divergência > 10%: pedido retido, sem OS. Aguarda aprovação da gerência.
        toast.warning(
          res.message ?? `${linhas.length} amostra(s) registrada(s). Aguardando aprovação da gerência (divergência > 10%).`,
        )
      } else {
        toast.success(`${linhas.length} amostra(s) registrada(s).`)
      }
      if (res.etiquetasGeradas) {
        toast.success(`${res.etiquetasGeradas} etiqueta(s) de lâmina geradas.`)
      }
      if (res.ordensFalhas && res.ordensFalhas > 0) {
        toast.error(`${res.ordensFalhas} Ordem(ns) de Serviço não foram criadas — verifique a Fila.`)
      }
      if (res.credito && res.credito.abatido > 0) {
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        toast.success(`Crédito abatido: ${fmt(res.credito.abatido)} · saldo ${fmt(res.credito.saldo)}`)
      }
      // abre a Ordem de Serviço (folha sem valores) num modal — só quando há OS
      // (pedido retido para aprovação ainda não tem OS).
      if (!res.precisaAprovacao) {
        onImprimir?.(`/imprimir/os/${pedido.id}`)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar recebimento')
    } finally {
      setSaving(false)
    }
  }

  if (!pedido) return null

  const clienteLabel = pedido.clienteNomeFantasia
    ? `${pedido.clienteNomeFantasia} — ${pedido.clienteNome}`
    : pedido.clienteNome

  // agrupa as linhas por recipiente para renderização
  const grupos = recipientes.length
    ? recipientes.map((r) => ({ recipiente: r, linhas: linhas.filter((l) => l.recipienteId === r.id) }))
    : [{ recipiente: null, linhas: linhas.filter((l) => l.recipienteId == null) }]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Identificar amostras (Laboratório)"
      subtitle={`${pedido.numero} · ${clienteLabel}`}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Serviços solicitados */}
        <section className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <h3 className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Serviços solicitados
            </h3>
          </div>
          <ul className="space-y-1.5">
            {itens.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-slate-700 dark:text-slate-300 min-w-0">
                  <span className="font-mono text-slate-400 mr-1.5">{it.servico.codigo}</span>
                  {it.servico.nome}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    min={1}
                    value={it.quantidade}
                    onChange={(e) => setItemQtd(it.id, e.target.value)}
                    onBlur={() => salvarItemQtd(it)}
                    className="w-14 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[12px] px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400">A quantidade é salva no pedido ao sair do campo.</p>
        </section>

        <Input
          label="Identificado por"
          value={recebidoPor}
          onChange={(e) => setRecebidoPor(e.target.value)}
          placeholder="Nome do responsável (laboratório)"
        />

        {/* Conferência */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Conferência
          </h3>
          <div className="grid grid-cols-3 gap-3 items-end">
            <Input
              label="Qtd prevista"
              type="number"
              min="0"
              value={qtdPrevista}
              onChange={(e) => { setPrevistaManual(true); setQtdPrevista(e.target.value) }}
              hint="Padrão = soma dos itens"
            />
            <Input
              label="Recebendo"
              type="number"
              min="0"
              value={qtdRecebida}
              onChange={(e) => setQtdRecebida(e.target.value)}
              hint="Padrão = nº de amostras"
            />
            <div>
              <span className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Diferença</span>
              <div className={`rounded-md border px-3 py-2 text-[13px] tabular-nums font-semibold ${
                diferenca > 0
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
                  : diferenca < 0
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500'
              }`}>
                {diferenca > 0 ? `+${diferenca}` : diferenca}
              </div>
            </div>
          </div>
          {diferenca > 0 && (
            <p className="text-[12px] text-rose-600 dark:text-rose-400">
              Excedente: {diferenca} amostra(s) a mais que o previsto — será sinalizado para cobrança.
            </p>
          )}
          <textarea
            value={obsConferencia}
            onChange={(e) => setObsConferencia(e.target.value)}
            rows={2}
            placeholder="Observação da conferência (opcional)…"
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px]
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
          />
        </section>

        {/* Amostras por recipiente */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-slate-400" />
            <h3 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Amostras por recipiente ({linhas.length})
            </h3>
          </div>

          {grupos.map((g, gi) => (
            <div key={g.recipiente?.id ?? `avulso-${gi}`} className="rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-3 py-2">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  <Package className="h-3.5 w-3.5 text-slate-400" />
                  {g.recipiente ? g.recipiente.tipo : 'Sem recipiente'}
                  {g.recipiente?.codigo && (
                    <span className="font-mono text-[11px] text-slate-400">{g.recipiente.codigo}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => addLinha(g.recipiente?.id ?? null)}
                  className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Plus className="h-3.5 w-3.5" /> amostra
                </button>
              </div>
              <div className="space-y-2 p-3">
                {g.linhas.length === 0 && (
                  <p className="text-[12px] text-slate-400">Nenhuma amostra neste recipiente.</p>
                )}
                {g.linhas.map((l, i) => (
                  <div key={l._key} className="flex items-end gap-2">
                    <span className="w-8 shrink-0 pb-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <Input
                        label=""
                        value={l.numeroCliente}
                        onChange={(e) => setLinha(l._key, 'numeroCliente', e.target.value)}
                        placeholder="Nº do cliente (ex: A26/123)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLinha(l._key)}
                      className="p-2 mb-0.5 text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <a
            href={`/imprimir/recipientes/${pedido.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <Printer className="h-3.5 w-3.5" /> Etiquetas dos recipientes
          </a>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Confirmar e imprimir OS
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  )
}
