'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

type ClienteOpt = { id: number; nome: string; nomeFantasia?: string | null }
type SaldoCliente = { clienteId: number; nome: string; nomeFantasia?: string | null; saldo: number }
type Movimento = { id: number; tipo: string; valor: number; descricao: string; saldo: number; createdAt: string }
type Extrato = { cliente: ClienteOpt; saldoAtual: number; movimentos: Movimento[] }
type FechLinha = { clienteId: number; nome: string; nomeFantasia?: string | null; qtdPedidos: number; totalBruto: number; adiantado: number; aFaturar: number; creditoSaldo: number }
type Fechamento = { ano: number; mes: number; linhas: FechLinha[]; totais: { clientes: number; pedidos: number; totalBruto: number; aFaturar: number } }

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
function nomeCli(c: { nome: string; nomeFantasia?: string | null }) {
  return c.nomeFantasia ?? c.nome
}

export default function FinanceiroPage() {
  const [resumo, setResumo] = useState<SaldoCliente[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [extrato, setExtrato] = useState<Extrato | null>(null)
  const [loading, setLoading] = useState(true)

  // formulário de lançamento
  const [showForm, setShowForm] = useState(false)
  const [fCliente, setFCliente] = useState('')
  const [fTipo, setFTipo] = useState<'credito' | 'debito'>('credito')
  const [fValor, setFValor] = useState('')
  const [fDescricao, setFDescricao] = useState('')
  const [saving, setSaving] = useState(false)

  // fechamento mensal
  const [mesRef, setMesRef] = useState(() => new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [coraOk, setCoraOk] = useState<boolean | null>(null)
  const [gerandoId, setGerandoId] = useState<number | null>(null)

  const fetchFechamento = useCallback(() => {
    const [ano, mes] = mesRef.split('-')
    api.get<Fechamento>(`/financeiro/fechamento?ano=${ano}&mes=${mes}`)
      .then(setFechamento)
      .catch(() => {})
  }, [mesRef])

  useEffect(() => { fetchFechamento() }, [fetchFechamento])
  useEffect(() => {
    api.get<{ configurada: boolean }>('/cobranca/status').then((r) => setCoraOk(r.configurada)).catch(() => setCoraOk(null))
  }, [])

  async function gerarCobranca(clienteId: number) {
    setGerandoId(clienteId)
    try {
      await api.post('/cobranca/gerar', { clienteId, periodo: mesRef })
      toast.success('Cobrança gerada (boleto emitido na Cora).')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao gerar cobrança')
    } finally {
      setGerandoId(null)
    }
  }

  const fetchResumo = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<SaldoCliente[]>('/financeiro/creditos/resumo')
      setResumo(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar saldos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResumo()
    api.get<{ data: ClienteOpt[] }>('/clientes?limit=500&ativo=true')
      .then((r) => setClientes(r.data))
      .catch(() => {})
  }, [fetchResumo])

  const abrirExtrato = useCallback(async (clienteId: number) => {
    try {
      const data = await api.get<Extrato>(`/financeiro/creditos/${clienteId}`)
      setExtrato(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar extrato')
    }
  }, [])

  async function lancar(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseFloat(fValor.replace(',', '.'))
    if (!fCliente) { toast.error('Selecione o cliente.'); return }
    if (!Number.isFinite(valor) || valor <= 0) { toast.error('Informe um valor válido.'); return }
    if (fDescricao.trim().length < 2) { toast.error('Informe uma descrição.'); return }
    setSaving(true)
    try {
      await api.post('/financeiro/creditos', {
        clienteId: Number(fCliente),
        tipo: fTipo,
        valor,
        descricao: fDescricao.trim(),
      })
      toast.success(fTipo === 'credito' ? 'Crédito lançado.' : 'Débito lançado.')
      setFValor(''); setFDescricao('')
      await fetchResumo()
      if (extrato?.cliente.id === Number(fCliente)) await abrirExtrato(Number(fCliente))
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao lançar')
    } finally {
      setSaving(false)
    }
  }

  const totalCreditos = resumo.reduce((s, r) => s + (r.saldo > 0 ? r.saldo : 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro — Crédito pré-pago"
        subtitle="Saldo, lançamentos e extrato dos clientes"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={fetchResumo}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
            </Button>
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-1.5" /> Lançar crédito/débito
            </Button>
          </div>
        }
      />

      {/* Formulário de lançamento */}
      {showForm && (
        <form onSubmit={lancar} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_140px_1fr_auto] gap-3 items-end">
            <Select
              label="Cliente"
              value={fCliente}
              onChange={(e) => setFCliente(e.target.value)}
              options={[
                { value: '', label: 'Selecione…' },
                ...clientes.map((c) => ({ value: String(c.id), label: nomeCli(c) })),
              ]}
            />
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Tipo</span>
              <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setFTipo('credito')}
                  className={`px-3 py-2 text-[13px] font-medium ${fTipo === 'credito' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
                  Crédito
                </button>
                <button type="button" onClick={() => setFTipo('debito')}
                  className={`px-3 py-2 text-[13px] font-medium ${fTipo === 'debito' ? 'bg-rose-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
                  Débito
                </button>
              </div>
            </div>
            <Input label="Valor (R$)" inputMode="decimal" value={fValor} onChange={(e) => setFValor(e.target.value)} placeholder="0,00" />
            <Input label="Descrição" value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} placeholder="Ex: NF 123 / consumo abril" />
            <Button type="submit" loading={saving}>Lançar</Button>
          </div>
        </form>
      )}

      {/* Fechamento mensal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fechamento mensal</h2>
          <input
            type="month"
            value={mesRef}
            onChange={(e) => setMesRef(e.target.value)}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fechamento && (
            <span className="ml-auto text-[12px] text-slate-400">
              {fechamento.totais.clientes} cliente(s) · {fechamento.totais.pedidos} pedido(s) ·
              a faturar: <strong className="text-slate-700 dark:text-slate-200">{fmtBRL(fechamento.totais.aFaturar)}</strong>
            </span>
          )}
        </div>
        {!fechamento || fechamento.linhas.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-slate-400">Nenhum pedido recebido neste mês.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Cliente</th>
                  <th className="px-4 py-2 font-semibold text-center">Pedidos</th>
                  <th className="px-4 py-2 font-semibold text-right">Bruto</th>
                  <th className="px-4 py-2 font-semibold text-right">Adiantado</th>
                  <th className="px-4 py-2 font-semibold text-right">A faturar</th>
                  <th className="px-4 py-2 font-semibold text-right">Crédito atual</th>
                  <th className="px-4 py-2 font-semibold text-right">Cobrança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fechamento.linhas.map((l) => (
                  <tr key={l.clienteId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200 cursor-pointer" onClick={() => abrirExtrato(l.clienteId)}>{l.nomeFantasia ?? l.nome}</td>
                    <td className="px-4 py-2 text-center tabular-nums">{l.qtdPedidos}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtBRL(l.totalBruto)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-400">{l.adiantado ? fmtBRL(l.adiantado) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-100">{fmtBRL(l.aFaturar)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${l.creditoSaldo > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{fmtBRL(l.creditoSaldo)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => gerarCobranca(l.clienteId)}
                        disabled={gerandoId === l.clienteId || l.aFaturar <= 0}
                        title={coraOk === false ? 'Cora ainda não configurada — a fatura é criada, o boleto sai quando configurar' : 'Gerar boleto na Cora'}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white"
                      >
                        {gerandoId === l.clienteId ? '…' : 'Gerar cobrança'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          {coraOk === false
            ? <>⚠️ <strong>Cora ainda não configurada</strong> — "Gerar cobrança" cria a fatura, mas o boleto só é emitido após cadastrar as credenciais (CORA_CLIENT_ID/CERT/KEY).</>
            : <>💡 "Gerar cobrança" cria a fatura do mês e emite o <strong>boleto (Cora)</strong>; a NFS-e depende da configuração fiscal no painel do banco.</>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Saldos por cliente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Saldos dos clientes</h2>
            <span className="ml-auto text-[12px] text-slate-400">Total em crédito: <strong className="text-emerald-600">{fmtBRL(totalCreditos)}</strong></span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-[13px] text-slate-400">Carregando…</div>
          ) : resumo.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-slate-400">
              Nenhum saldo lançado ainda. Use “Lançar crédito/débito”.
            </div>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {resumo.map((r) => (
                  <tr
                    key={r.clienteId}
                    onClick={() => abrirExtrato(r.clienteId)}
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 ${extrato?.cliente.id === r.clienteId ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
                  >
                    <td className="px-4 py-3 text-[13px] text-slate-700 dark:text-slate-200">{nomeCli(r)}</td>
                    <td className={`px-4 py-3 text-right text-[13px] font-semibold tabular-nums ${r.saldo < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {fmtBRL(r.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Extrato */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card overflow-hidden">
          {!extrato ? (
            <div className="py-16 text-center text-[13px] text-slate-400">
              Selecione um cliente para ver o extrato.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Extrato — {nomeCli(extrato.cliente)}
                </h2>
                <span className={`text-sm font-bold tabular-nums ${extrato.saldoAtual < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {fmtBRL(extrato.saldoAtual)}
                </span>
              </div>
              {extrato.movimentos.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-slate-400">Sem movimentos.</div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
                  {extrato.movimentos.map((m) => (
                    <li key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                      {m.tipo === 'credito'
                        ? <ArrowUpCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <ArrowDownCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-slate-700 dark:text-slate-200 truncate">{m.descricao}</p>
                        <p className="text-[11px] text-slate-400">{fmtDateTime(m.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[13px] font-semibold tabular-nums ${m.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.tipo === 'credito' ? '+' : '−'}{fmtBRL(m.valor)}
                        </p>
                        <p className="text-[11px] text-slate-400 tabular-nums">saldo {fmtBRL(m.saldo)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
