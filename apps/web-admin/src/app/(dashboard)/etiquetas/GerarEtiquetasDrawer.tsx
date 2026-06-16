'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { AmostraComContagem, TipoEtiqueta } from './types'

const TIPO_OPTS = [
  { value: 'lamina', label: 'Lâmina' },
  { value: 'cassete', label: 'Cassete' },
  { value: 'bloco', label: 'Bloco' },
]

interface Props {
  open: boolean
  onClose: () => void
  onGenerated: () => void
}

export function GerarEtiquetasDrawer({ open, onClose, onGenerated }: Props) {
  const [busca, setBusca] = useState('')
  const [amostras, setAmostras] = useState<AmostraComContagem[]>([])
  const [loadingAmostras, setLoadingAmostras] = useState(false)
  const [amostra, setAmostra] = useState<AmostraComContagem | null>(null)

  const [tipo, setTipo] = useState<TipoEtiqueta>('lamina')
  const [quantidade, setQuantidade] = useState('1')
  const [coloracao, setColoracao] = useState('')
  const [identificacao, setIdentificacao] = useState('')
  const [saving, setSaving] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAmostras = useCallback(async () => {
    setLoadingAmostras(true)
    try {
      const params = busca ? `?busca=${encodeURIComponent(busca)}` : ''
      const data = await api.get<AmostraComContagem[]>(`/etiquetas/amostras${params}`)
      setAmostras(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao carregar amostras')
    } finally {
      setLoadingAmostras(false)
    }
  }, [busca])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAmostras, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [open, fetchAmostras])

  // reset ao abrir
  useEffect(() => {
    if (open) {
      setAmostra(null)
      setTipo('lamina')
      setQuantidade('1')
      setColoracao('')
      setIdentificacao('')
      setBusca('')
    }
  }, [open])

  async function handleGerar() {
    if (!amostra) {
      toast.error('Selecione uma amostra.')
      return
    }
    const qtd = parseInt(quantidade, 10)
    if (!Number.isFinite(qtd) || qtd < 1) {
      toast.error('Informe uma quantidade válida.')
      return
    }
    setSaving(true)
    try {
      const res = await api.post<{ message: string }>('/etiquetas/gerar', {
        amostraId: amostra.id,
        tipo,
        quantidade: qtd,
        coloracao: coloracao.trim() || undefined,
        identificacao: identificacao.trim() || undefined,
      })
      toast.success(res.message ?? 'Etiquetas geradas.')
      onGenerated()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao gerar etiquetas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Gerar etiquetas" subtitle="Code128 por lâmina/cassete">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Seleção de amostra */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
            Amostra
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar por nº interno, pedido ou cliente…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-2 text-[13px]
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
            {loadingAmostras ? (
              <div className="py-6 text-center text-[12px] text-slate-400">Carregando…</div>
            ) : amostras.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-slate-400">
                Nenhuma amostra encontrada.
              </div>
            ) : (
              amostras.map((a) => {
                const sel = amostra?.id === a.id
                const cli = a.pedido.cliente.nomeFantasia ?? a.pedido.cliente.nome
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAmostra(a)}
                    className={`w-full text-left px-3 py-2 transition-colors ${
                      sel
                        ? 'bg-blue-50 dark:bg-blue-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {a.numeroInterno}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {a.totalEtiquetas > 0 ? `${a.totalEtiquetas} etiqueta(s)` : 'sem etiquetas'}
                      </span>
                    </div>
                    <div className="text-[12px] text-slate-600 dark:text-slate-400 truncate">{cli}</div>
                    <div className="text-[11px] text-slate-400">
                      {a.pedido.numero} · {a.especie} · {a.material}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Parâmetros */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoEtiqueta)}
            options={TIPO_OPTS}
          />
          <Input
            label="Quantidade"
            type="number"
            min="1"
            max="200"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>

        <Input
          label="Coloração / serviço"
          placeholder="ex: .HE"
          value={coloracao}
          onChange={(e) => setColoracao(e.target.value)}
        />

        <Input
          label="Identificação (linha-topo)"
          placeholder="ex: PatoVetLab-DF/01 /M10"
          hint="Opcional. O nº da lâmina é anexado automaticamente (… 1, … 2)."
          value={identificacao}
          onChange={(e) => setIdentificacao(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleGerar} loading={saving} disabled={!amostra}>
          Gerar {quantidade && parseInt(quantidade, 10) > 0 ? `(${parseInt(quantidade, 10)})` : ''}
        </Button>
      </div>
    </Drawer>
  )
}
