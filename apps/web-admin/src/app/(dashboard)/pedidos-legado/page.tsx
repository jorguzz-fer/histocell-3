'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Send, ChevronDown, Tags, Plus, AlertTriangle, BadgeDollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { useOrderCart, fmtBRL } from '@/hooks/useOrderCart'
import { CartItemRow } from '@/components/ui/CartItemRow'
import { ServicoLegadoTable } from '@/components/legado/ServicoLegadoTable'
import { CatalogoTabs } from '@/components/pedidos/CatalogoTabs'

export default function PedidosLegadoPage() {
  const router = useRouter()
  const {
    clienteId, setClienteId, observacoes, setObservacoes, itens, saving, saved, clientes,
    cliente, isPesquisador, totalGeral, pedidoCriado, limparPedidoCriado,
    urgente, setUrgente, pagamentoAdiantado, setPagamentoAdiantado, creditoSaldo,
    addServico, addItemDireto, addPacote, removeItem, updateItem, handleSalvar,
  } = useOrderCart()

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pedido</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Catálogo no formato da planilha — busque pelo código, edite, arquive ou crie serviços
          </p>
        </div>
        {isPesquisador && <Badge variant="amber">Preço Pesquisa</Badge>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        {/* Esquerda: cliente + tabela legado */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cliente</h2>
            <Select
              label=""
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              options={[
                { value: '', label: 'Selecione o cliente…' },
                ...clientes.map((c) => ({ value: String(c.id), label: c.nomeFantasia ? `${c.nomeFantasia} — ${c.nome}` : c.nome })),
              ]}
            />
            {cliente && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isPesquisador ? 'amber' : 'slate'}>{isPesquisador ? 'Pesquisador' : cliente.segmento}</Badge>
                <span className="text-xs text-slate-400">Preços em {isPesquisador ? 'pesquisa' : 'rotina'}</span>
                {creditoSaldo != null && creditoSaldo > 0 && (
                  <Badge variant="green">
                    Crédito disponível: {creditoSaldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <CatalogoTabs
            clienteId={clienteId}
            isPesquisador={isPesquisador}
            cliente={cliente}
            onAdd={addServico}
            addItemDireto={addItemDireto}
            legadoSlot={<ServicoLegadoTable isPesquisador={isPesquisador} onAdd={addServico} onAddPacote={addPacote} />}
          />
        </div>

        {/* Direita: resumo do pedido */}
        <div className="sticky top-6 space-y-4">
          {pedidoCriado && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-500/30 overflow-hidden">
              <div className="px-5 py-4 bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-100 dark:border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Pedido gerado!</p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">{pedidoCriado.numero}</p>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  Gere as etiquetas dos itens deste pedido para conferência e impressão.
                </p>
                <Button
                  className="w-full"
                  onClick={() => router.push(`/etiquetas/conferencia?pedido=${pedidoCriado.id}`)}
                >
                  <Tags className="h-4 w-4 mr-2" /> Gerar Etiquetas
                </Button>
                <Button variant="secondary" className="w-full" onClick={limparPedidoCriado}>
                  <Plus className="h-4 w-4 mr-2" /> Novo pedido
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Itens do Pedido</h2>
              {itens.length > 0 && <Badge variant="blue">{itens.length} item{itens.length !== 1 ? 's' : ''}</Badge>}
            </div>

            {itens.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <ChevronDown className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Adicione serviços pela tabela</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
                {itens.map((item) => (
                  <CartItemRow key={item.key} item={item} onRemove={removeItem} onUpdate={updateItem} />
                ))}
              </div>
            )}

            {itens.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgente(!urgente)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      urgente
                        ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Urgente
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagamentoAdiantado(!pagamentoAdiantado)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      pagamentoAdiantado
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <BadgeDollarSign className="h-3.5 w-3.5" /> Pago adiantado
                  </button>
                </div>
                <textarea placeholder="Observações internas (não visível ao cliente)…" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{fmtBRL(totalGeral)}</span>
                </div>
                {saved ? (
                  <div className="flex items-center gap-2 justify-center py-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Salvo com sucesso!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button className="w-full" onClick={() => handleSalvar('enviado')} loading={saving}>
                      <Send className="h-4 w-4 mr-2" /> Enviar Pedido
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={() => handleSalvar('rascunho')} loading={saving}>
                      Salvar como Rascunho
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
