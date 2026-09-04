'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DoorOpen, Package, Plus, Printer, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ClienteAvatar } from '@/components/ui/ClienteAvatar'
import { ClienteSearchInput } from '@/components/ui/ClienteSearchInput'
import { PrintModal } from '@/components/PrintModal'
import { ClienteDrawer } from '@/app/(dashboard)/cadastro/ClienteDrawer'
import { api } from '@/lib/api'
import { etapaCurta } from '@/lib/proximoPasso'
import type { Cliente } from '@/app/(dashboard)/cadastro/types'
import {
  CONDICOES,
  CONDICAO_BTN,
  type EntradaAvulsa,
  type TipoRecipiente,
} from './types'

type Linha = {
  tipo: string
  condicao: string
  quantidade: string
  observacoes: string
  /** Nomes de paciente por pacote (fluxo Macroscopia). */
  pacientes: string[]
}

const LINHA_VAZIA: Linha = { tipo: '', condicao: '', quantidade: '1', observacoes: '', pacientes: [] }

function fmtHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function EntradaPage() {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [linhas, setLinhas] = useState<Linha[]>([{ ...LINHA_VAZIA }])
  const [recebidoPor, setRecebidoPor] = useState('')
  const [tipos, setTipos] = useState<TipoRecipiente[]>([])
  const [salvando, setSalvando] = useState(false)

  const [entradas, setEntradas] = useState<EntradaAvulsa[]>([])
  const [carregando, setCarregando] = useState(true)

  const [printUrl, setPrintUrl] = useState<string | null>(null)
  const [novoClienteNome, setNovoClienteNome] = useState<string | null>(null)

  const carregarTipos = useCallback(
    () => api.get<TipoRecipiente[]>('/recebimento/tipos-recipiente').then(setTipos).catch(() => {}),
    [],
  )

  const carregarEntradas = useCallback(() => {
    setCarregando(true)
    return api
      .get<EntradaAvulsa[]>('/recebimento/entradas?dias=1')
      .then(setEntradas)
      .catch((e) => toast.error(e.message ?? 'Erro ao carregar entradas'))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    carregarTipos()
    carregarEntradas()
  }, [carregarTipos, carregarEntradas])

  function setLinha(i: number, campo: 'tipo' | 'condicao' | 'quantidade' | 'observacoes', valor: string) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  function setPaciente(i: number, k: number, valor: string) {
    setLinhas((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l
        const pacientes = [...l.pacientes]
        pacientes[k] = valor
        return { ...l, pacientes }
      }),
    )
  }

  async function novoTipo() {
    const nome = window.prompt('Novo tipo de objeto (ex.: Envelope, Isopor):')?.trim()
    if (!nome) return
    try {
      await api.post('/recebimento/tipos-recipiente', { nome })
      await carregarTipos()
      toast.success(`Tipo "${nome}" criado.`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao criar tipo')
    }
  }

  function limpar() {
    setCliente(null)
    setLinhas([{ ...LINHA_VAZIA }])
    setRecebidoPor('')
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault()
    if (!cliente) {
      toast.error('Identifique o cliente antes de registrar.')
      return
    }
    const preenchidas = linhas.filter((l) => l.tipo && parseInt(l.quantidade, 10) > 0)
    if (preenchidas.length === 0) {
      toast.error('Informe ao menos um objeto (tipo + quantidade).')
      return
    }
    // A condição decide o departamento de destino — sem ela a OS não sabe onde
    // começar, então é obrigatória.
    if (preenchidas.some((l) => !l.condicao)) {
      toast.error('Diga a condição de cada objeto (Macroscopia, Molhado ou Seco).')
      return
    }
    // Macroscopia identifica cada pacote pelo nome do paciente — o nome é o que
    // vai na etiqueta, então é obrigatório aqui.
    const macroSemNome = preenchidas.some(
      (l) =>
        l.condicao === 'macroscopia' &&
        Array.from({ length: parseInt(l.quantidade, 10) || 0 }).some(
          (_, k) => !(l.pacientes[k] ?? '').trim(),
        ),
    )
    if (macroSemNome) {
      toast.error('Informe o nome do paciente de cada pacote de Macroscopia.')
      return
    }
    // Macroscopia vira um volume por pacote (cada um com seu paciente); as
    // demais condições mantêm o volume com a quantidade agrupada.
    const recipientes = preenchidas.flatMap((l) => {
      const qtd = parseInt(l.quantidade, 10)
      const obs = l.observacoes.trim() || undefined
      if (l.condicao === 'macroscopia') {
        return Array.from({ length: qtd }, (_, k) => ({
          tipo: l.tipo,
          condicao: 'macroscopia',
          quantidade: 1,
          paciente: (l.pacientes[k] ?? '').trim() || undefined,
          observacoes: obs,
        }))
      }
      return [{ tipo: l.tipo, condicao: l.condicao, quantidade: qtd, observacoes: obs }]
    })

    setSalvando(true)
    try {
      const res = await api.post<{
        message: string
        ids: number[]
        ordemServico: { id: number; numero: string }
      }>(
        '/recebimento/entrada-avulsa',
        { clienteId: cliente.id, recebidoPor: recebidoPor.trim() || undefined, recipientes },
      )
      toast.success(res.message)
      // Abre direto a folha de etiquetas: a etiqueta é colada no objeto agora.
      setPrintUrl(`/imprimir/entrada?ids=${res.ids.join(',')}`)
      limpar()
      carregarEntradas()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar entrada')
    } finally {
      setSalvando(false)
    }
  }

  const totalVolumes = linhas.reduce(
    (soma, l) => soma + (l.tipo ? parseInt(l.quantidade, 10) || 0 : 0),
    0,
  )

  return (
    <>
      <PageHeader
        title="Entrada"
        subtitle="Identifique o cliente e o que chegou. Cada objeto recebe uma etiqueta para colar no recipiente."
        action={
          <Button variant="secondary" size="sm" onClick={carregarEntradas} disabled={carregando}>
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Registrar ────────────────────────────────────────────────── */}
        <form
          onSubmit={registrar}
          className="space-y-5 rounded-card border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <ClienteSearchInput
            value={cliente}
            onChange={setCliente}
            onCriarNovo={(nome) => setNovoClienteNome(nome)}
            autoFocus
          />

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  O que chegou
                </h3>
              </div>
              <button
                type="button"
                onClick={novoTipo}
                className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
              >
                + Novo tipo
              </button>
            </div>

            {linhas.map((l, i) => (
              <div key={i} className="space-y-1.5 rounded-md border border-slate-200 p-2.5 dark:border-slate-700">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label=""
                      value={l.tipo}
                      onChange={(e) => setLinha(i, 'tipo', e.target.value)}
                      options={[
                        { value: '', label: 'Tipo de objeto…' },
                        ...tipos.map((t) => ({ value: t.nome, label: t.nome })),
                      ]}
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      label=""
                      type="number"
                      min="1"
                      value={l.quantidade}
                      onChange={(e) => setLinha(i, 'quantidade', e.target.value)}
                    />
                  </div>
                  {linhas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLinhas((p) => p.filter((_, idx) => idx !== i))}
                      className="mb-0.5 p-2 text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {/* A condição decide o departamento de destino, então é escolha
                    explícita — não um select que se erra sem perceber. Cada
                    condição entra uma vez só: a que outra linha já usou fica
                    desabilitada aqui (um objeto por condição). */}
                <div className="grid grid-cols-3 gap-1.5">
                  {CONDICOES.map((c) => {
                    const usadaEmOutra = linhas.some((o, idx) => idx !== i && o.condicao === c.value)
                    const selecionada = l.condicao === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        title={usadaEmOutra ? `${c.label} já foi usada em outro objeto` : c.ajuda}
                        disabled={usadaEmOutra}
                        onClick={() => setLinha(i, 'condicao', c.value)}
                        className={`rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors ${
                          selecionada
                            ? CONDICAO_BTN[c.cor].on
                            : usadaEmOutra
                              ? 'cursor-not-allowed border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600'
                              : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>

                {/* Macroscopia: um nome de paciente por pacote — é o que vai na
                    etiqueta e identifica o material na bancada. */}
                {l.condicao === 'macroscopia' &&
                  Array.from({ length: parseInt(l.quantidade, 10) || 0 }).map((_, k) => (
                    <Input
                      key={k}
                      label=""
                      value={l.pacientes[k] ?? ''}
                      onChange={(e) => setPaciente(i, k, e.target.value)}
                      placeholder={`Paciente ${k + 1} — nome do animal`}
                    />
                  ))}

                <Input
                  label=""
                  value={l.observacoes}
                  onChange={(e) => setLinha(i, 'observacoes', e.target.value)}
                  placeholder="Observação (opcional)"
                />
              </div>
            ))}

            {/* No máximo um objeto por condição (Macroscopia, Molhado, Seco). */}
            {linhas.length < CONDICOES.length && (
              <button
                type="button"
                onClick={() => setLinhas((p) => [...p, { ...LINHA_VAZIA }])}
                className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar objeto
              </button>
            )}
          </section>

          <Input
            label="Recebido por"
            value={recebidoPor}
            onChange={(e) => setRecebidoPor(e.target.value)}
            placeholder="Quem recebeu"
          />

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <span className="text-[12px] text-slate-500">
              {totalVolumes > 0
                ? `${totalVolumes} etiqueta${totalVolumes > 1 ? 's' : ''} a imprimir`
                : 'Nenhum objeto informado'}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={limpar} disabled={salvando}>
                Limpar
              </Button>
              <Button type="submit" loading={salvando}>
                Registrar e imprimir
              </Button>
            </div>
          </div>
        </form>

        {/* ── Entradas de hoje ─────────────────────────────────────────── */}
        <section className="rounded-card border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <DoorOpen className="h-4 w-4 text-slate-400" />
            <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              Entradas de hoje
            </h2>
            <span className="text-[12px] text-slate-400">({entradas.length})</span>
          </header>

          {carregando ? (
            <p className="px-5 py-8 text-center text-[13px] text-slate-500">Carregando…</p>
          ) : entradas.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-slate-500">
              Nenhuma entrada registrada hoje.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {entradas.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <ClienteAvatar
                    nome={e.clienteNomeFantasia ?? e.clienteNome}
                    seed={e.clienteId ?? undefined}
                    size={30}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                      {e.clienteNomeFantasia ?? e.clienteNome}
                    </p>
                    <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                      {e.paciente && (
                        <span className="font-medium text-slate-700 dark:text-slate-200">{e.paciente} · </span>
                      )}
                      {e.tipo}
                      {e.condicao ? ` (${e.condicao})` : ''} ·{' '}
                      <span className="font-mono">{e.codigo}</span> · {fmtHora(e.createdAt)}
                      {e.recebidoPor ? ` · ${e.recebidoPor}` : ''}
                    </p>
                    {e.osCodigoCurto && (
                      <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-400">
                        <Link href="/os" className="hover:underline" title="Abrir a tela de Ordem de Serviço">
                          OS {e.osCodigoCurto}
                        </Link>
                        {/* Onde a OS deste volume está agora — o guia da recepção. */}
                        {e.osEtapa && e.osStatus !== 'concluida' && e.osStatus !== 'cancelada' && (
                          <span className="inline-flex items-center rounded-full border border-blue-400 px-2 py-px text-[10px] font-medium text-blue-700 dark:border-blue-500 dark:text-blue-400">
                            aguardando {etapaCurta(e.osEtapa).toLowerCase()}
                          </span>
                        )}
                        {e.osStatus === 'concluida' && (
                          <span className="inline-flex items-center rounded-full border border-slate-300 px-2 py-px text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400">
                            concluída
                          </span>
                        )}
                      </p>
                    )}
                    {e.observacoes && (
                      <p className="truncate text-[11px] text-slate-400">{e.observacoes}</p>
                    )}
                  </div>
                  {e.vinculada ? (
                    <Badge variant="green">{e.pedidoCodigoCurto ?? 'Vinculada'}</Badge>
                  ) : (
                    <Badge variant="amber">Sem orçamento</Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => setPrintUrl(`/imprimir/entrada?ids=${e.id}`)}
                    className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    title="Reimprimir etiqueta"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <PrintModal
        open={printUrl != null}
        onClose={() => setPrintUrl(null)}
        url={printUrl}
        title="Etiquetas da entrada"
      />

      {/* Cliente novo direto da recepção — ao salvar, já entra selecionado. */}
      <ClienteDrawer
        open={novoClienteNome != null}
        onClose={() => setNovoClienteNome(null)}
        cliente={null}
        nomeInicial={novoClienteNome ?? undefined}
        onSaved={(criado) => {
          if (criado) setCliente(criado)
          setNovoClienteNome(null)
        }}
      />
    </>
  )
}
