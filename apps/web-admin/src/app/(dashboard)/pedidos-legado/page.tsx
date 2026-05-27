'use client'

import { Trash2, CheckCircle2, Send, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { useOrderCart, fmtBRL, itemSubtotal } from '@/hooks/useOrderCart'
import { ServicoLegadoTable } from '@/components/legado/ServicoLegadoTable'

export default function PedidosLegadoPage() {
  const {
    clienteId, setClienteId, observacoes, setObservacoes, itens, saving, saved, clientes,
    cliente, isPesquisador, totalGeral,
    addServico, removeItem, updateItem, handleSalvar,
  } = useOrderCart()

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pedido Legado</h1>
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
              <div className="flex items-center gap-2">
                <Badge variant={isPesquisador ? 'amber' : 'slate'}>{isPesquisador ? 'Pesquisador' : cliente.segmento}</Badge>
                <span className="text-xs text-slate-400">Preços em {isPesquisador ? 'pesquisa' : 'rotina'}</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <ServicoLegadoTable isPesquisador={isPesquisador} onAdd={addServico} />
          </div>
        </div>

        {/* Direita: resumo do pedido */}
        <div className="sticky top-6 space-y-4">
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
                  <div key={item.key} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{item.nome}</p>
                        <p className="text-[11px] text-slate-400">{item.categoria}</p>
                      </div>
                      <button onClick={() => removeItem(item.key)} className="text-slate-300 hover:text-red-500 shrink-0 mt-0.5">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Qtd</label>
                        <input type="number" min="1" step="1" value={item.quantidade}
                          onChange={(e) => updateItem(item.key, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Preço (R$)</label>
                        <input type="number" min="0" step="0.01" value={item.preco}
                          onChange={(e) => updateItem(item.key, 'preco', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Desc.%</label>
                        <input type="number" min="0" max="100" step="0.5" value={item.desconto}
                          onChange={(e) => updateItem(item.key, 'desconto', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="text-right text-[12px] font-semibold text-slate-700 dark:text-slate-300">{fmtBRL(itemSubtotal(item))}</div>
                  </div>
                ))}
              </div>
            )}

            {itens.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <textarea placeholder="Observações (opcional)…" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2}
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
