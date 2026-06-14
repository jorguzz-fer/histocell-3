'use client'

import { Trash2 } from 'lucide-react'
import { fmtBRL, itemSubtotal, type OrderCartItem, type DescontoTipo } from '@/hooks/useOrderCart'

const inputCls =
  'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500'

interface CartItemRowProps {
  item: OrderCartItem
  onRemove: (key: string) => void
  onUpdate: (
    key: string,
    field: 'quantidade' | 'preco' | 'desconto' | 'descontoTipo',
    value: number | DescontoTipo,
  ) => void
}

export function CartItemRow({ item, onRemove, onUpdate }: CartItemRowProps) {
  const isValor = item.descontoTipo === 'valor'

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
            {item.nome}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.categoria}</p>
        </div>
        <button
          onClick={() => onRemove(item.key)}
          className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors shrink-0 mt-0.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">Qtd</label>
          <input
            type="number" min="1" step="1"
            value={item.quantidade}
            onChange={(e) => onUpdate(item.key, 'quantidade', parseInt(e.target.value) || 1)}
            className={`${inputCls} text-center`}
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">Preço (R$)</label>
          <input
            type="number" min="0" step="0.01"
            value={item.preco}
            onChange={(e) => onUpdate(item.key, 'preco', parseFloat(e.target.value) || 0)}
            className={inputCls}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[10px] text-slate-400 dark:text-slate-500">Desconto</label>
            {/* Toggle % / R$ */}
            <div className="flex rounded overflow-hidden border border-slate-200 dark:border-slate-700">
              {(['pct', 'valor'] as DescontoTipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdate(item.key, 'descontoTipo', t)}
                  className={`px-1.5 text-[10px] font-semibold leading-none py-0.5 transition-colors ${
                    item.descontoTipo === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600'
                  }`}
                >
                  {t === 'pct' ? '%' : 'R$'}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number" min="0"
            max={isValor ? undefined : 100}
            step={isValor ? '0.01' : '0.5'}
            value={item.desconto}
            onChange={(e) => onUpdate(item.key, 'desconto', parseFloat(e.target.value) || 0)}
            className={inputCls}
            placeholder={isValor ? 'R$' : '%'}
          />
        </div>
      </div>

      <div className="text-right text-[12px] font-semibold text-slate-700 dark:text-slate-300">
        {fmtBRL(itemSubtotal(item))}
      </div>
    </div>
  )
}
