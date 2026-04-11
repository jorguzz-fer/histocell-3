'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronRight, AlertCircle, Tag, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'

// ─── tipos ───────────────────────────────────────────────────────────────────

interface CascadeOptions {
  categorias:  string[]
  tipos:       string[]
  variante1s:  string[]
  variante2s:  string[]
  variante3s:  string[]
  variante4s:  string[]
  variante5s:  string[]
  services:    Servico[]
  total:       number
}

interface CascadeState {
  categoria: string
  tipo:      string
  v1:        string
  v2:        string
  v3:        string
  v4:        string
  v5:        string
}

const EMPTY_STATE: CascadeState = {
  categoria: '', tipo: '', v1: '', v2: '', v3: '', v4: '', v5: '',
}

// Nomes amigáveis para cada variante por tipo
const VARIANTE_LABELS: Record<string, string[]> = {
  Eppendorf:     ['Tipo de Corte', 'Configuração', 'Quantidade', 'Espessura', 'Finalização'],
  Histológico:   ['Suporte', 'Nível / Técnica', 'Repetições', 'Espessura', 'Coloração'],
  Microdissecção:['Tipo', 'Quantidade de Cortes', 'Repetições', 'Espessura', 'Finalização'],
  default:       ['Variante 1', 'Variante 2', 'Variante 3', 'Variante 4', 'Variante 5'],
}

function getLabel(tipo: string, idx: number): string {
  const labels = VARIANTE_LABELS[tipo] ?? VARIANTE_LABELS['default']
  return labels[idx] ?? `Variante ${idx + 1}`
}

// ─── NovoServicoModal (inline, com variantes pré-preenchidas) ─────────────────

interface NovoModalProps {
  prefill: CascadeState & { nome?: string }
  onClose: () => void
  onCriado: (s: Servico) => void
}

const CATEGORIAS = [
  'Macroscopia','Processamento','Criostato','Cortes Histológico','Cortes Eppendorf',
  'Colorações','Coloração Específica','Imunohistoquímica','Imunofluorescência',
  'Citologia','Análises','Laudos','Imagem','Outros',
  'Descarte/Devolução','IPOG','Insumos/Materiais','Anticorpo','Logística',
  'Consultoria/Serviços','Manutenção',
].map((v) => ({ value: v, label: v }))

function NovoServicoModal({ prefill, onClose, onCriado }: NovoModalProps) {
  const [nome, setNome]           = useState(prefill.nome ?? '')
  const [categoria, setCategoria] = useState(prefill.categoria || 'Outros')
  const [tipo, setTipo]           = useState(prefill.tipo)
  const [v1, setV1]               = useState(prefill.v1)
  const [v2, setV2]               = useState(prefill.v2)
  const [v3, setV3]               = useState(prefill.v3)
  const [v4, setV4]               = useState(prefill.v4)
  const [v5, setV5]               = useState(prefill.v5)
  const [precoRotina, setPrecoRotina]     = useState('')
  const [precoPesquisa, setPrecoPesquisa] = useState('')
  const [saving, setSaving]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !precoRotina) {
      toast.error('Nome e preço rotina são obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const rot = parseFloat(precoRotina)
      const pes = parseFloat(precoPesquisa) || rot
      const novo = await api.post<Servico>('/pedidos/servicos/novo', {
        codigo: `CUSTOM-${Date.now()}`,
        categoria,
        nome: nome.trim(),
        precoBase: rot,
        precoRotina: rot,
        precoPesquisa: pes,
        tipo:      tipo      || undefined,
        variante1: v1        || undefined,
        variante2: v2        || undefined,
        variante3: v3        || undefined,
        variante4: v4        || undefined,
        variante5: v5        || undefined,
      })
      toast.success('Serviço criado e já disponível na cascata!')
      onCriado(novo)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao criar serviço')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            Criar novo serviço
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Serviço não encontrado na cascata? Crie agora e ele ficará disponível para futuros pedidos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nome do serviço *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Corte histológico 6º nível" />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={CATEGORIAS} />
            <Input label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Eppendorf, Histológico…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['Variante 1', v1, setV1],
              ['Variante 2', v2, setV2],
              ['Variante 3', v3, setV3],
              ['Variante 4', v4, setV4],
              ['Variante 5', v5, setV5],
            ].map(([label, value, setter]: any) => (
              <Input
                key={label as string}
                label={label as string}
                value={value as string}
                onChange={(e) => setter(e.target.value)}
                placeholder="Opcional"
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço Rotina (R$) *"
              type="number" min="0" step="0.01"
              value={precoRotina} onChange={(e) => setPrecoRotina(e.target.value)}
              placeholder="0,00"
            />
            <Input
              label="Preço Pesquisa (R$)"
              type="number" min="0" step="0.01"
              value={precoPesquisa} onChange={(e) => setPrecoPesquisa(e.target.value)}
              placeholder="= rotina"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving}>Criar serviço</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CascadingServicoSelector ─────────────────────────────────────────────────

interface Props {
  isPesquisador: boolean
  onSelect: (servico: Servico) => void
}

export function CascadingServicoSelector({ isPesquisador, onSelect }: Props) {
  const [state, setState]     = useState<CascadeState>(EMPTY_STATE)
  const [options, setOptions] = useState<CascadeOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const [novoModal, setNovoModal] = useState(false)

  const fetchOptions = useCallback(async (s: CascadeState) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (s.categoria) params.set('categoria', s.categoria)
      if (s.tipo)      params.set('tipo',      s.tipo)
      if (s.v1)        params.set('v1',        s.v1)
      if (s.v2)        params.set('v2',        s.v2)
      if (s.v3)        params.set('v3',        s.v3)
      if (s.v4)        params.set('v4',        s.v4)
      const data = await api.get<CascadeOptions>(`/pedidos/servicos/cascade?${params}`)
      setOptions(data)
    } catch {
      toast.error('Erro ao carregar opções da cascata')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOptions(state)
  }, [state, fetchOptions])

  function set(key: keyof CascadeState, value: string) {
    // Reset all downstream levels when a level changes
    const keys: (keyof CascadeState)[] = ['categoria','tipo','v1','v2','v3','v4','v5']
    const idx = keys.indexOf(key)
    const reset: Partial<CascadeState> = {}
    keys.slice(idx + 1).forEach((k) => { reset[k] = '' })
    setState((prev) => ({ ...prev, ...reset, [key]: value }))
  }

  function reset() {
    setState(EMPTY_STATE)
    setOptions(null)
  }

  const priceKey = isPesquisador ? 'precoPesquisa' : 'precoRotina'

  function renderDropdown(
    label: string,
    value: string,
    opts: string[],
    onChange: (v: string) => void,
    placeholder = 'Selecione…',
  ) {
    if (opts.length === 0) return null
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">{placeholder}</option>
          {opts.sort().map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    )
  }

  const o = options

  // Determine which cascata steps to show
  const showTipo    = Boolean(state.categoria && o && o.tipos.length > 0)
  const showV1      = Boolean(o && o.variante1s.length > 0)
  const showV2      = Boolean(o && o.variante2s.length > 0)
  const showV3      = Boolean(o && o.variante3s.length > 0)
  const showV4      = Boolean(o && o.variante4s.length > 0)
  const showV5      = Boolean(o && o.variante5s.length > 0)

  // One match → auto-suggest; multiple → show list
  const matched = o?.services ?? []

  return (
    <div className="space-y-4">
      {/* ── Cascata de selects ── */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Seleção Guiada
          </span>
          {(state.categoria || state.tipo) && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>

        {/* Step 1: Categoria */}
        {renderDropdown('Categoria / Serviço', state.categoria, o?.categorias ?? [], (v) => set('categoria', v))}

        {/* Step 2: Tipo */}
        {showTipo && renderDropdown('Tipo', state.tipo, o?.tipos ?? [], (v) => set('tipo', v))}

        {/* Step 3-7: Variantes */}
        {showV1 && renderDropdown(getLabel(state.tipo, 0), state.v1, o?.variante1s ?? [], (v) => set('v1', v))}
        {showV2 && renderDropdown(getLabel(state.tipo, 1), state.v2, o?.variante2s ?? [], (v) => set('v2', v))}
        {showV3 && renderDropdown(getLabel(state.tipo, 2), state.v3, o?.variante3s ?? [], (v) => set('v3', v))}
        {showV4 && renderDropdown(getLabel(state.tipo, 3), state.v4, o?.variante4s ?? [], (v) => set('v4', v))}
        {showV5 && renderDropdown(getLabel(state.tipo, 4), state.v5, o?.variante5s ?? [], (v) => set('v5', v))}

        {/* Breadcrumb de progresso */}
        {state.categoria && (
          <div className="flex items-center gap-1 flex-wrap text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            {[state.categoria, state.tipo, state.v1, state.v2, state.v3, state.v4, state.v5]
              .filter(Boolean)
              .map((step, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{step}</span>
                  {i < arr.length - 1 && <ChevronRight className="h-3 w-3" />}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* ── Resultado da cascata ── */}
      {loading && (
        <div className="text-center py-4 text-sm text-slate-400">Carregando…</div>
      )}

      {!loading && state.categoria && matched.length === 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Serviço não encontrado nessa combinação</span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Crie agora e ele ficará salvo para futuros pedidos.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setNovoModal(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Criar serviço com essa combinação
          </Button>
        </div>
      )}

      {!loading && matched.length === 1 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{matched[0].nome}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {matched[0].categoria}
              {matched[0].tipo ? ` · ${matched[0].tipo}` : ''}
            </p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {Number(matched[0][priceKey]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              {isPesquisador && <span className="ml-1 text-[10px] font-normal text-amber-500">pesquisa</span>}
            </p>
          </div>
          <Button onClick={() => onSelect(matched[0])} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      )}

      {!loading && matched.length > 1 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {matched.length} serviços encontrados — refine ou escolha:
          </p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {matched.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
              >
                <div>
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                    {s.nome}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {s.categoria}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0 ml-2">
                  {Number(s[priceKey]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setNovoModal(true)}
            className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Não encontrei — criar novo serviço
          </button>
        </div>
      )}

      {novoModal && (
        <NovoServicoModal
          prefill={{ ...state, nome: '' }}
          onClose={() => setNovoModal(false)}
          onCriado={(s) => {
            onSelect(s)
            setNovoModal(false)
            reset()
          }}
        />
      )}
    </div>
  )
}
