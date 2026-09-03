'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, FlaskConical, Package, Plus, Printer, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ServicoSearchInput } from '@/components/ui/ServicoSearchInput'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import { EtiquetaPrintArea } from '@/app/(dashboard)/etiquetas/EtiquetaPrintArea'
import type { Etiqueta, EtiquetaListResponse } from '@/app/(dashboard)/etiquetas/types'
import {
  clienteDaOS,
  clienteIdDaOS,
  CONDICAO_UI,
  type ItemOS,
  type OrdemServico,
  type QuadroOS,
} from './types'

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
  const [condicao, setCondicao] = useState('')
  const [encaminhando, setEncaminhando] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  // Identificação dos cassetes (pedido do Célio/Fernando): depois de adicionar
  // o item, cada cassete recebe o código do cliente e vira etiqueta pequena —
  // que entra na mesma conferência de saída das etiquetas de amostra.
  const [etiquetasOS, setEtiquetasOS] = useState<Etiqueta[]>([])
  const [identItem, setIdentItem] = useState<ItemOS | null>(null)
  const [idents, setIdents] = useState<string[]>([])
  const [gerando, setGerando] = useState(false)
  const [printList, setPrintList] = useState<Etiqueta[]>([])

  const carregarEtiquetas = useCallback(async () => {
    if (!os) return
    try {
      const res = await api.get<EtiquetaListResponse>(`/etiquetas?ordemServicoId=${os.id}&limit=200`)
      setEtiquetasOS(res.data)
    } catch {
      /* lista de etiquetas é acessório — não bloqueia a janela */
    }
  }, [os])

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
    setCondicao('')
    setIdentItem(null)
    carregarItens()
    carregarEtiquetas()
    // O endpoint devolve o catálogo inteiro (array), sem paginação.
    api
      .get<Servico[]>('/pedidos/servicos')
      .then(setServicos)
      .catch(() => {})
  }, [open, os, carregarItens, carregarEtiquetas])

  // Quadros seco × molhado × macroscopia calculados no cliente, para reagir na
  // hora à medida que os serviços são lançados.
  const quadros: QuadroOS[] = useMemo(() => {
    if (!os) return []
    const conds = Array.from(
      new Set([
        ...os.volumes.map((v) => v.condicao).filter((c): c is string => !!c),
        ...itens.map((i) => i.condicao).filter((c): c is string => !!c),
      ]),
    )
    return conds.map((cond) => {
      const nVol = os.volumes.filter((v) => v.condicao === cond).length
      const its = itens.filter((i) => i.condicao === cond)
      const unidades = its.reduce((sum, i) => sum + i.quantidade, 0)
      return {
        condicao: cond,
        volumes: nVol,
        unidades,
        completo: nVol > 0 && unidades >= nVol,
        encaminhados: its.filter((i) => i.encaminhadoEm).length,
        totalItens: its.length,
      }
    })
  }, [os, itens])

  // Sugere a condição do próximo lançamento: a primeira ainda em aberto (menos
  // unidades que volumes); se todas fechadas/uma só, a primeira presente.
  useEffect(() => {
    if (!open || condicao) return
    const aberto = quadros.find((q) => !q.completo)
    const sugestao = aberto?.condicao ?? quadros[0]?.condicao ?? ''
    if (sugestao) setCondicao(sugestao)
  }, [open, quadros, condicao])

  async function enviarItem(forcar?: boolean, justificativa?: string) {
    if (!os) return
    await api.post(`/ordens/${os.id}/itens`, {
      servicoId: Number(servicoId),
      quantidade: Math.max(1, parseInt(quantidade, 10) || 1),
      condicao: condicao || undefined,
      forcar,
      justificativa,
    })
  }

  async function adicionar() {
    if (!os || !servicoId) {
      toast.error('Escolha o serviço.')
      return
    }
    setSalvando(true)
    try {
      await enviarItem()
      setServicoId('')
      setQuantidade('1')
      await carregarItens()
      onSaved()
    } catch (e: any) {
      // Quadro fechado: guiar sem travar — a gerência libera com justificativa.
      const msg = String(e?.message ?? '')
      if (/quadro/i.test(msg) && /completo/i.test(msg)) {
        const just = window.prompt(
          `${msg}\n\nJustificativa para reabrir o quadro (gerência):`,
        )?.trim()
        if (!just) {
          setSalvando(false)
          return
        }
        try {
          await enviarItem(true, just)
          setServicoId('')
          setQuantidade('1')
          await carregarItens()
          onSaved()
          toast.success('Serviço lançado (quadro reaberto com justificativa).')
        } catch (e2: any) {
          toast.error(e2.message ?? 'Erro ao adicionar serviço')
        }
      } else {
        toast.error(msg || 'Erro ao adicionar serviço')
      }
    } finally {
      setSalvando(false)
    }
  }

  async function encaminharTecnica(cond: string) {
    if (!os) return
    setEncaminhando(cond)
    try {
      const res = await api.post<{ message: string }>(`/ordens/${os.id}/encaminhar`, {
        condicao: cond,
      })
      toast.success(res.message)
      await carregarItens()
      onSaved()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao encaminhar')
    } finally {
      setEncaminhando('')
    }
  }

  function abrirIdentificacao(item: ItemOS) {
    setIdentItem(item)
    setIdents(Array.from({ length: item.quantidade }, () => ''))
  }

  async function imprimirEtiquetas(lista: Etiqueta[]) {
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
    carregarEtiquetas()
  }

  async function gerarEImprimir() {
    if (!os || !identItem) return
    if (idents.some((i) => !i.trim())) {
      toast.error('Preencha a identificação de todos os cassetes.')
      return
    }
    setGerando(true)
    try {
      const res = await api.post<{ etiquetas: Etiqueta[] }>(`/ordens/${os.id}/etiquetas`, {
        identificacoes: idents.map((i) => i.trim()),
        itemOrdemServicoId: identItem.id,
        tipo: 'cassete',
      })
      toast.success(`${res.etiquetas.length} etiqueta(s) gerada(s).`)
      setIdentItem(null)
      await imprimirEtiquetas(res.etiquetas)
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao gerar etiquetas')
    } finally {
      setGerando(false)
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
                  {v.paciente && <span className="font-medium text-slate-700 dark:text-slate-200">{v.paciente}</span>}
                  {v.condicao && (
                    <Badge variant={v.condicao === 'molhado' ? 'blue' : v.condicao === 'macroscopia' ? 'purple' : 'amber'}>
                      {v.condicao}
                    </Badge>
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
          {/* Condição do serviço: mantém "cada um no seu quadrado" na mesma OS.
              Só pergunta quando há mais de uma condição entre os volumes. */}
          {quadros.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Condição:</span>
              {quadros.map((q) => {
                const ui = CONDICAO_UI[q.condicao] ?? { label: q.condicao, badge: 'slate' as const }
                return (
                  <button
                    key={q.condicao}
                    type="button"
                    onClick={() => setCondicao(q.condicao)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      condicao === q.condicao
                        ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {ui.label}
                    <span className="ml-1 font-mono text-slate-400">
                      {q.unidades}/{q.volumes || '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Quadros seco × molhado × macroscopia — cada um no seu quadrado. */}
        {quadros.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Quadros da OS
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {quadros.map((q) => {
                const ui = CONDICAO_UI[q.condicao] ?? { label: q.condicao, badge: 'slate' as const }
                const pendentesEnc = q.totalItens - q.encaminhados
                return (
                  <div
                    key={q.condicao}
                    className={`rounded-lg border p-3 ${
                      q.completo
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={ui.badge}>{ui.label}</Badge>
                      <span className="font-mono text-[12px] text-slate-600 dark:text-slate-300">
                        {q.unidades}/{q.volumes || '—'}
                        {q.completo && <span className="ml-1 text-emerald-600">✓</span>}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {q.volumes === 0
                        ? 'Sem volume desta condição na entrada.'
                        : q.completo
                          ? `Fechado: ${q.unidades} unidade(s) para ${q.volumes} volume(s).`
                          : `Faltam ${q.volumes - q.unidades} unidade(s) para fechar.`}
                    </p>
                    {q.condicao === 'seco' && q.totalItens > 0 && (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">
                          {q.encaminhados > 0
                            ? `${q.encaminhados}/${q.totalItens} à técnica`
                            : 'na recepção'}
                        </span>
                        {pendentesEnc > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={encaminhando === q.condicao}
                            onClick={() => encaminharTecnica(q.condicao)}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Encaminhar à técnica
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

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
                    <p className="flex items-center gap-1.5 truncate text-[13px] text-slate-800 dark:text-slate-200">
                      <span className="font-mono text-slate-400">{i.servico.codigo}</span>{' '}
                      {i.servico.nome}
                      {i.condicao && CONDICAO_UI[i.condicao] && (
                        <Badge variant={CONDICAO_UI[i.condicao].badge}>{CONDICAO_UI[i.condicao].label}</Badge>
                      )}
                      {i.encaminhadoEm && (
                        <span className="text-[10px] text-emerald-600" title={`À técnica${i.encaminhadoPor ? ' por ' + i.encaminhadoPor : ''}`}>
                          → técnica
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {i.quantidade} × {fmtBRL(i.preco)}
                      {i.desconto > 0 ? ` · −${i.desconto}%` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                    {fmtBRL(i.preco * i.quantidade * (1 - i.desconto / 100))}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => abrirIdentificacao(i)}
                    title="Identificar cada cassete com o código do cliente e imprimir as etiquetas pequenas"
                  >
                    <Tags className="h-3.5 w-3.5" />
                    Cassetes
                  </Button>
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

        {/* Identificação dos cassetes do item escolhido: um código do cliente
            por posição, gera e imprime as etiquetas pequenas de uma vez. */}
        {identItem && (
          <section className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-500/40 dark:bg-blue-500/5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Identificar {identItem.quantidade} cassete{identItem.quantidade > 1 ? 's' : ''} · {identItem.servico.nome}
              </h3>
              <button
                type="button"
                onClick={() => setIdentItem(null)}
                className="text-[12px] text-slate-400 hover:text-slate-600"
              >
                cancelar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {idents.map((v, idx) => (
                <Input
                  key={idx}
                  label=""
                  value={v}
                  onChange={(e) => {
                    const novos = [...idents]
                    novos[idx] = e.target.value
                    setIdents(novos)
                  }}
                  placeholder={`Cassete ${idx + 1} — cód. do cliente`}
                />
              ))}
            </div>
            <Button onClick={gerarEImprimir} loading={gerando} className="w-full justify-center">
              <Printer className="h-4 w-4" />
              Gerar e imprimir {identItem.quantidade} etiqueta{identItem.quantidade > 1 ? 's' : ''}
            </Button>
          </section>
        )}

        {/* Etiquetas já geradas nesta OS — entram na conferência de saída. */}
        {etiquetasOS.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Etiquetas da OS ({etiquetasOS.length})
              </h3>
              <Button size="sm" variant="secondary" onClick={() => imprimirEtiquetas(etiquetasOS)}>
                <Printer className="h-3.5 w-3.5" />
                Reimprimir todas
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {etiquetasOS.map((e) => (
                <span
                  key={e.id}
                  title={e.codigo}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  <span className="font-mono text-slate-400">C{e.laminaSeq}</span>
                  {e.identificacao}
                  {e.itemOrdemServico && (
                    <span className="font-mono text-slate-400" title={e.itemOrdemServico.servico.nome}>
                      · {e.itemOrdemServico.servico.codigo}
                    </span>
                  )}
                  {e.impresso && <span className="text-emerald-500" title="Já impressa">✓</span>}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
          <span className="text-[13px] text-slate-500">
            Total: <strong className="text-slate-800 dark:text-slate-200">{fmtBRL(total)}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => window.open(`/imprimir/ordem/${os.id}`, '_blank')}
              title="Imprimir a OS para entregar à área técnica"
            >
              <Printer className="h-4 w-4" />
              Imprimir OS
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>

      {printList.length > 0 && <EtiquetaPrintArea etiquetas={printList} />}
    </Modal>
  )
}
