'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { portalApi } from '@/lib/api'

// ─── tipos ───────────────────────────────────────────────────────────────────
type Info = {
  cliente: { id: number; nome: string; nomeFantasia: string | null }
  isPesquisador: boolean
  saldo: number
}
type Servico = { id: number; codigo: string; nome: string; categoria: string; preco: number; desconto: number }
type PacoteItem = { servicoId: number; quantidade: number; nome: string; categoria: string; preco: number; desconto: number }
type Pacote = { id: number; codigo: string; nome: string; itens: PacoteItem[]; precoTotal: number; totalItens: number; categorias: string[] }
type Catalogo = { servicos: Servico[]; pacotes: Pacote[]; populares: Servico[]; historico: Servico[] }
type PedidoItem = { codigo: string | null; nome: string; quantidade: number; subtotal: number }
type Pedido = { numero: string; status: string; origem: string; createdAt: string; totalItens: number; valorTotal: number; itens?: PedidoItem[] }
type LaudoCliente = { id: number; arquivoNome?: string | null; liberadoEm?: string | null; pedidoNumero?: string | null }
type FaturaCliente = { numero: string; periodo: string; status: string; valorTotal: number; dataVencimento?: string | null; linhaDigitavel?: string | null; pixQrCode?: string | null; pdfUrl?: string | null }
type CartItem = { servicoId: number; codigo?: string; nome: string; preco: number; desconto: number; quantidade: number }
type Tab = 'catalogo' | 'pacotes' | 'historico' | 'populares' | 'extrato'

type Movimento = {
  id: number
  pedidoId: number | null
  tipo: 'credito' | 'debito'
  valor: number
  descricao: string | null
  saldo: number
  createdAt: string
}

type Extrato = { saldo: number; movimentos: Movimento[] }

const STATUS: Record<string, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  enviado: { label: 'Aguardando recebimento', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  recebido: { label: 'Em processamento', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  cancelado: { label: 'Cancelado', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataFmt(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}
function subtotal(i: { preco: number; desconto: number; quantidade: number }) {
  return i.preco * i.quantidade * (1 - (i.desconto || 0) / 100)
}
function codeNum(c: string) {
  const n = parseInt(c, 10)
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
}

export default function PortalPedidoPage() {
  const token = useParams<{ token: string }>().token

  const [info, setInfo] = useState<Info | null>(null)
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [pedidoAberto, setPedidoAberto] = useState<string | null>(null)
  const [laudos, setLaudos] = useState<LaudoCliente[]>([])
  const [faturas, setFaturas] = useState<FaturaCliente[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(false)

  const [tab, setTab] = useState<Tab>('catalogo')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')

  const [cart, setCart] = useState<Record<number, CartItem>>({})
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState<{ numero: string; valorTotal: number } | null>(null)
  const [editandoNumero, setEditandoNumero] = useState<string | null>(null)
  const [rascunhoSalvo, setRascunhoSalvo] = useState<string | null>(null)

  const [extrato, setExtrato] = useState<Extrato | null>(null)
  const [extratoLoading, setExtratoLoading] = useState(false)

  // Carrega o extrato ao abrir a aba (refaz a cada vez para refletir saldo em tempo real)
  useEffect(() => {
    if (tab !== 'extrato' || !token) return
    setExtratoLoading(true)
    portalApi.get<Extrato>(`/portal/${token}/extrato`)
      .then(setExtrato)
      .catch(() => setExtrato({ saldo: 0, movimentos: [] }))
      .finally(() => setExtratoLoading(false))
  }, [tab, token])

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTema() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('tema', next ? 'dark' : 'light') } catch {}
  }

  const fetchPedidos = useCallback(() => {
    portalApi.get<Pedido[]>(`/portal/${token}/pedidos`).then(setPedidos).catch(() => {})
    portalApi.get<LaudoCliente[]>(`/portal/${token}/laudos`).then(setLaudos).catch(() => {})
    portalApi.get<FaturaCliente[]>(`/portal/${token}/faturas`).then(setFaturas).catch(() => {})
  }, [token])

  function copiar(texto?: string | null) {
    if (!texto) return
    navigator.clipboard?.writeText(texto)
  }

  async function baixarLaudo(l: LaudoCliente) {
    try {
      const r = await portalApi.get<{ arquivoBase64: string; arquivoNome: string }>(`/portal/${token}/laudo/${l.id}/arquivo`)
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${r.arquivoBase64}`
      link.download = r.arquivoNome || 'laudo.pdf'
      link.click()
    } catch {}
  }

  useEffect(() => {
    let ok = true
    Promise.all([
      portalApi.get<Info>(`/portal/${token}`),
      portalApi.get<Catalogo>(`/portal/${token}/catalogo`),
    ])
      .then(([i, c]) => { if (ok) { setInfo(i); setCatalogo(c); fetchPedidos() } })
      .catch((e) => { if (ok) setErro(e.message ?? 'Link inválido') })
      .finally(() => { if (ok) setLoading(false) })
    return () => { ok = false }
  }, [token, fetchPedidos])

  // ── carrinho ────────────────────────────────────────────────────────────────
  const add = useCallback((s: { id?: number; servicoId?: number; codigo?: string; nome: string; preco: number; desconto: number }, qtd = 1) => {
    const id = s.servicoId ?? s.id!
    setCart((prev) => {
      const atual = prev[id]
      return { ...prev, [id]: { servicoId: id, codigo: s.codigo, nome: s.nome, preco: s.preco, desconto: s.desconto, quantidade: (atual?.quantidade ?? 0) + qtd } }
    })
  }, [])
  function setQtd(id: number, q: number) {
    setCart((prev) => {
      if (q <= 0) { const n = { ...prev }; delete n[id]; return n }
      return { ...prev, [id]: { ...prev[id], quantidade: q } }
    })
  }
  function addPacote(p: Pacote) { p.itens.forEach((it) => add(it, it.quantidade)) }

  const itensCart = Object.values(cart)
  const total = itensCart.reduce((s, i) => s + subtotal(i), 0)

  function limparCart() { setCart({}); setObs(''); setEditandoNumero(null) }

  async function salvar(status: 'enviado' | 'rascunho') {
    if (itensCart.length === 0) return
    setEnviando(true)
    setRascunhoSalvo(null)
    try {
      const body = {
        itens: itensCart.map((i) => ({ servicoId: i.servicoId, quantidade: i.quantidade })),
        observacoes: obs.trim() || undefined,
        status,
      }
      const res = editandoNumero
        ? await portalApi.patch<{ numero: string; valorTotal: number }>(`/portal/${token}/pedido/${editandoNumero}`, body)
        : await portalApi.post<{ numero: string; valorTotal: number }>(`/portal/${token}/pedido`, body)
      if (status === 'enviado') setEnviado(res)
      else setRascunhoSalvo(res.numero)
      limparCart()
      fetchPedidos()
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao salvar pedido')
    } finally {
      setEnviando(false)
    }
  }

  // Reabre um rascunho no carrinho para continuar
  async function continuarRascunho(numero: string) {
    try {
      const r = await portalApi.get<{ numero: string; observacoes?: string | null; itens: { servicoId: number; quantidade: number }[] }>(
        `/portal/${token}/pedido/${numero}`,
      )
      const mapa: Record<number, CartItem> = {}
      const catItens = [...(catalogo?.servicos ?? []), ...(catalogo?.populares ?? []), ...(catalogo?.historico ?? [])]
      for (const it of r.itens) {
        const s = catItens.find((c) => c.id === it.servicoId)
        mapa[it.servicoId] = {
          servicoId: it.servicoId,
          codigo: s?.codigo,
          nome: s?.nome ?? `Serviço ${it.servicoId}`,
          preco: s?.preco ?? 0,
          desconto: s?.desconto ?? 0,
          quantidade: it.quantidade,
        }
      }
      setCart(mapa)
      setObs(r.observacoes ?? '')
      setEditandoNumero(numero)
      setEnviado(null); setRascunhoSalvo(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao abrir rascunho')
    }
  }

  async function excluirRascunho(numero: string) {
    if (!confirm(`Excluir o rascunho ${numero}?`)) return
    try {
      await portalApi.delete(`/portal/${token}/pedido/${numero}`)
      if (editandoNumero === numero) limparCart()
      fetchPedidos()
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao excluir rascunho')
    }
  }

  // ── filtros do catálogo ────────────────────────────────────────────────────
  const categorias = useMemo(
    () => Array.from(new Set((catalogo?.servicos ?? []).map((s) => s.categoria))).sort(),
    [catalogo],
  )
  const servicosFiltrados = useMemo(() => {
    let list = catalogo?.servicos ?? []
    if (categoria) list = list.filter((s) => s.categoria === categoria)
    const q = busca.trim().toLowerCase()
    if (q) {
      if (/^\d+$/.test(q)) {
        const exato = list.filter((s) => s.codigo === q || codeNum(s.codigo) === parseInt(q, 10))
        list = exato.length ? exato : list.filter((s) => s.codigo.startsWith(q))
      } else {
        list = list.filter((s) => s.nome.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q))
      }
    }
    return [...list].sort((a, b) => codeNum(a.codigo) - codeNum(b.codigo))
  }, [catalogo, busca, categoria])

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-400 dark:bg-slate-950">Carregando…</div>
  }
  if (erro && !info) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center dark:bg-slate-950">
        <div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Link inválido</p>
          <p className="text-sm text-slate-500 mt-1">{erro}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-histocell-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-white/60">Portal do Cliente · Histocell</p>
            <h1 className="text-lg font-bold leading-tight truncate">
              {info?.cliente.nomeFantasia ?? info?.cliente.nome}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {info && info.saldo > 0 && (
              <div className="text-right">
                <p className="text-[11px] text-white/60">Crédito</p>
                <p className="text-base font-bold text-emerald-300">{brl(info.saldo)}</p>
              </div>
            )}
            <button
              onClick={toggleTema}
              title={dark ? 'Tema claro' : 'Tema escuro'}
              className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-6">
        {enviado ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-12 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-3xl">✓</div>
            <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-white">Pedido enviado!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Nº <span className="font-mono font-semibold">{enviado.numero}</span> · total {brl(enviado.valorTotal)}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Seu pedido entrou na fila de recebimento do laboratório.</p>
            <button onClick={() => setEnviado(null)} className="mt-6 rounded-lg bg-histocell-600 hover:bg-histocell-700 text-white text-sm font-medium px-4 py-2">
              Fazer novo pedido
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
            {/* Catálogo / abas */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                {([['catalogo', 'Catálogo'], ['pacotes', 'Pacotes'], ['historico', 'Histórico'], ['populares', 'Mais usados'], ['extrato', 'Extrato']] as [Tab, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`flex-1 whitespace-nowrap px-3 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                      tab === k ? 'border-histocell-600 text-histocell-700 dark:text-histocell-100 dark:border-histocell-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {tab === 'catalogo' && (
                  <div className="space-y-3">
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar por código ou nome…"
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-histocell-500"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <CatPill active={!categoria} onClick={() => setCategoria('')}>Todas</CatPill>
                      {categorias.map((c) => (
                        <CatPill key={c} active={categoria === c} onClick={() => setCategoria(categoria === c ? '' : c)}>{c}</CatPill>
                      ))}
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[55vh] overflow-y-auto">
                      {servicosFiltrados.slice(0, 200).map((s) => <ServicoRow key={s.id} s={s} onAdd={() => add(s)} />)}
                      {servicosFiltrados.length === 0 && <p className="py-8 text-center text-[13px] text-slate-400">Nenhum serviço encontrado.</p>}
                    </div>
                  </div>
                )}

                {tab === 'pacotes' && (
                  <div className="space-y-2">
                    {(catalogo?.pacotes ?? []).length === 0 ? (
                      <p className="py-8 text-center text-[13px] text-slate-400">Nenhum pacote disponível.</p>
                    ) : (
                      catalogo!.pacotes.map((p) => (
                        <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                                <span className="font-mono text-slate-400 mr-1.5">{p.codigo}</span>{p.nome}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {p.itens.map((it) => (it.quantidade > 1 ? `${it.quantidade}× ` : '') + it.nome).join(' + ')}
                              </p>
                            </div>
                            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 shrink-0">{brl(p.precoTotal)}</span>
                          </div>
                          <button onClick={() => addPacote(p)} className="mt-2 w-full rounded-md bg-histocell-600 hover:bg-histocell-700 text-white text-xs font-medium py-1.5">
                            Adicionar pacote
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {tab === 'historico' && <ListaServicos lista={catalogo?.historico ?? []} onAdd={add} vazio="Você ainda não tem histórico de serviços." />}
                {tab === 'populares' && <ListaServicos lista={catalogo?.populares ?? []} onAdd={add} vazio="Sem serviços em destaque." />}
                {tab === 'extrato' && <ExtratoView data={extrato} loading={extratoLoading} />}
              </div>
            </div>

            {/* Carrinho */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 lg:sticky lg:top-4">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Seu pedido</h2>
                <span className="text-[12px] text-slate-400">{itensCart.length} item(ns)</span>
              </div>
              {itensCart.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-slate-400">Adicione serviços ao pedido.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[45vh] overflow-y-auto">
                  {itensCart.map((i) => (
                    <div key={i.servicoId} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] text-slate-700 dark:text-slate-200 leading-tight">{i.nome}</p>
                        <button onClick={() => setQtd(i.servicoId, 0)} className="text-slate-300 hover:text-rose-500 text-xs shrink-0">remover</button>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQtd(i.servicoId, i.quantidade - 1)} className="h-6 w-6 rounded border border-slate-200 dark:border-slate-700 text-slate-500">−</button>
                          <input value={i.quantidade} onChange={(e) => setQtd(i.servicoId, parseInt(e.target.value, 10) || 0)} className="h-6 w-10 text-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px]" />
                          <button onClick={() => setQtd(i.servicoId, i.quantidade + 1)} className="h-6 w-6 rounded border border-slate-200 dark:border-slate-700 text-slate-500">+</button>
                        </div>
                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 tabular-nums">{brl(subtotal(i))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Observações (opcional)…"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-histocell-500" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Total</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{brl(total)}</span>
                </div>
                {editandoNumero && (
                  <p className="text-[12px] text-amber-600 dark:text-amber-400 text-center">
                    Editando rascunho <strong>{editandoNumero}</strong> ·{' '}
                    <button onClick={limparCart} className="underline">cancelar</button>
                  </p>
                )}
                <button onClick={() => salvar('enviado')} disabled={itensCart.length === 0 || enviando}
                  className="w-full rounded-lg bg-histocell-600 hover:bg-histocell-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5">
                  {enviando ? 'Enviando…' : 'Enviar pedido'}
                </button>
                <button onClick={() => salvar('rascunho')} disabled={itensCart.length === 0 || enviando}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-sm font-semibold py-2.5">
                  {editandoNumero ? 'Salvar rascunho' : 'Salvar como rascunho'}
                </button>
                {rascunhoSalvo && <p className="text-[12px] text-emerald-600 text-center">Rascunho {rascunhoSalvo} salvo. Você pode concluí-lo depois.</p>}
                {erro && info && <p className="text-[12px] text-rose-600 text-center">{erro}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Últimos pedidos */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Meus últimos pedidos</h2>
          </div>
          {pedidos.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-slate-400">Você ainda não tem pedidos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Pedido</th>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium text-center">Itens</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pedidos.map((p) => {
                    const st = STATUS[p.status] ?? { label: p.status, cls: 'bg-slate-100 text-slate-600' }
                    const isRascunho = p.status === 'rascunho'
                    const temItens = (p.itens?.length ?? 0) > 0
                    const aberto = pedidoAberto === p.numero
                    return (
                      <Fragment key={p.numero}>
                      <tr className={`text-slate-700 dark:text-slate-200 ${isRascunho ? 'bg-amber-50/40 dark:bg-amber-500/5' : ''}`}>
                        <td className="px-4 py-2 font-mono">{p.numero}</td>
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{dataFmt(p.createdAt)}</td>
                        <td className="px-4 py-2 text-center tabular-nums">
                          {temItens ? (
                            <button
                              onClick={() => setPedidoAberto(aberto ? null : p.numero)}
                              className="inline-flex items-center gap-1 font-medium text-histocell-600 hover:text-histocell-700"
                              aria-expanded={aberto}
                            >
                              <span className={`transition-transform ${aberto ? 'rotate-90' : ''}`}>▸</span>
                              {p.totalItens}
                            </button>
                          ) : (
                            p.totalItens
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{brl(p.valorTotal)}</td>
                        <td className="px-4 py-2">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-2">
                          {isRascunho ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => continuarRascunho(p.numero)}
                                className="text-[11px] font-medium px-2 py-1 rounded-md bg-histocell-600 hover:bg-histocell-700 text-white">
                                Continuar
                              </button>
                              <button onClick={() => excluirRascunho(p.numero)}
                                className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 hover:text-rose-600">
                                Excluir
                              </button>
                            </div>
                          ) : temItens ? (
                            <button
                              onClick={() => setPedidoAberto(aberto ? null : p.numero)}
                              className="block ml-auto text-[11px] font-medium px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 hover:text-histocell-700"
                            >
                              {aberto ? 'Ocultar itens' : 'Ver itens'}
                            </button>
                          ) : (
                            <span className="block text-right text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                      {aberto && temItens && (
                        <tr className="bg-slate-50/70 dark:bg-slate-800/30">
                          <td colSpan={6} className="px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Itens solicitados</p>
                            <ul className="space-y-1">
                              {p.itens!.map((it, i) => (
                                <li key={i} className="flex items-center justify-between gap-3 text-[13px]">
                                  <span className="text-slate-700 dark:text-slate-200">
                                    {it.codigo && <span className="font-mono text-slate-400 mr-1.5">{it.codigo}</span>}
                                    {it.nome}
                                  </span>
                                  <span className="flex items-center gap-4 tabular-nums text-slate-500 dark:text-slate-400">
                                    <span>× {it.quantidade}</span>
                                    <span className="w-20 text-right">{brl(it.subtotal)}</span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Minhas faturas (2ª via) */}
        {faturas.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Minhas faturas</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {faturas.map((f) => (
                <div key={f.numero} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                        {f.numero} · {brl(f.valorTotal)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {f.status === 'paga' ? 'Paga' : `Vence ${f.dataVencimento ? dataFmt(f.dataVencimento) : '—'}`}
                      </p>
                    </div>
                    {f.status === 'paga'
                      ? <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Paga</span>
                      : <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Em aberto</span>}
                  </div>
                  {f.status !== 'paga' && (
                    <div className="flex flex-wrap gap-2">
                      {f.pdfUrl && (
                        <a href={f.pdfUrl} target="_blank" rel="noreferrer"
                          className="text-[12px] font-medium px-2.5 py-1 rounded-md bg-histocell-600 hover:bg-histocell-700 text-white">
                          Baixar boleto
                        </a>
                      )}
                      {f.linhaDigitavel && (
                        <button onClick={() => copiar(f.linhaDigitavel)}
                          className="text-[12px] font-medium px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                          Copiar linha digitável
                        </button>
                      )}
                      {f.pixQrCode && (
                        <button onClick={() => copiar(f.pixQrCode)}
                          className="text-[12px] font-medium px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                          Copiar Pix
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Meus laudos */}
        {laudos.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Meus laudos</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {laudos.map((l) => (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                      Pedido {l.pedidoNumero ?? '—'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Liberado em {l.liberadoEm ? dataFmt(l.liberadoEm) : '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => baixarLaudo(l)}
                    className="shrink-0 rounded-lg bg-histocell-600 hover:bg-histocell-700 text-white text-[12px] font-medium px-3 py-1.5"
                  >
                    Ver resultado
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contato */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Fale com a Histocell</h2>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <Contato rotulo="E-mail — Dúvidas Técnicas">
              <a href="mailto:histocell@histocell.com.br" className="text-histocell-600 dark:text-histocell-100 hover:underline">histocell@histocell.com.br</a>
            </Contato>
            <Contato rotulo="E-mail — Orçamento">
              <a href="mailto:histocell.financeiro@gmail.com" className="text-histocell-600 dark:text-histocell-100 hover:underline">histocell.financeiro@gmail.com</a>
            </Contato>
            <Contato rotulo="Telefone">
              <a href="tel:+551130609190" className="text-slate-700 dark:text-slate-200 hover:underline">(11) 3060-9190</a>
            </Contato>
            <Contato rotulo="WhatsApp">
              <a href="https://wa.me/5511960848484" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">(11) 96084-8484</a>
            </Contato>
            <Contato rotulo="Endereço" full>
              <span className="text-slate-600 dark:text-slate-300">Rua Teodoro Sampaio, 417 — 11º andar — Sala 113 — Pinheiros, São Paulo - SP</span>
            </Contato>
          </div>
        </section>
      </div>
    </div>
  )
}

// ─── subcomponentes ────────────────────────────────────────────────────────────
function CatPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${active ? 'bg-histocell-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
      {children}
    </button>
  )
}

function ServicoRow({ s, onAdd }: { s: Servico; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-[13px] text-slate-800 dark:text-slate-100 leading-tight truncate">
          <span className="font-mono text-slate-400 mr-1.5">{s.codigo}</span>{s.nome}
        </p>
        <p className="text-[11px] text-slate-400">{s.categoria} · {brl(s.preco)}{s.desconto ? ` (−${s.desconto}%)` : ''}</p>
      </div>
      <button onClick={onAdd} className="shrink-0 rounded-md bg-histocell-600 hover:bg-histocell-700 text-white text-xs font-medium px-3 py-1.5">Adicionar</button>
    </div>
  )
}

function ListaServicos({ lista, onAdd, vazio }: { lista: Servico[]; onAdd: (s: Servico) => void; vazio: string }) {
  if (lista.length === 0) return <p className="py-8 text-center text-[13px] text-slate-400">{vazio}</p>
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[55vh] overflow-y-auto">
      {lista.map((s) => <ServicoRow key={s.id} s={s} onAdd={() => onAdd(s)} />)}
    </div>
  )
}

function ExtratoView({ data, loading }: { data: Extrato | null; loading: boolean }) {
  if (loading) return <p className="py-8 text-center text-[13px] text-slate-400">Carregando extrato…</p>
  if (!data) return <p className="py-8 text-center text-[13px] text-slate-400">Não foi possível carregar o extrato.</p>

  const { saldo, movimentos } = data

  return (
    <div className="space-y-3">
      {/* Saldo destacado */}
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">Saldo atual</p>
          <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">Crédito pré-pago disponível</p>
        </div>
        <p className={`text-xl font-bold tabular-nums ${saldo > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
          {brl(saldo)}
        </p>
      </div>

      {/* Movimentos */}
      {movimentos.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-400">Nenhum movimento registrado ainda.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium text-right">Valor</th>
                <th className="px-3 py-2 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[55vh]">
              {movimentos.map((m) => {
                const isCredito = m.tipo === 'credito'
                return (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{dataFmt(m.createdAt)}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {m.descricao ?? (isCredito ? 'Crédito' : 'Débito')}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap ${isCredito ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isCredito ? '+' : '−'} {brl(Math.abs(m.valor))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">{brl(m.saldo)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Contato({ rotulo, children, full }: { rotulo: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{rotulo}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}
