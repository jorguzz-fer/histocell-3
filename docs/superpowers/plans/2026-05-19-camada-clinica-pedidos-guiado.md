# Camada de Inteligência Clínica no Pedido Guiado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma aba "Clínico" ao `pedidos-guiado` real que mapeia intenção clínica (painéis IHC de 1 clique, marcadores, colorações por pergunta) para `Servico` reais via resolver frontend estático, reusando o pipeline `addServico` nativo.

**Architecture:** Resolver puro em `lib/clinica/` cruza `clinical-intelligence.json` (asset do handoff) com `Servico[]` do catálogo real por `codigo`/`codigoLegado`. Componente isolado `ClinicoTab` (espelha `CascadingServicoSelector`) conforma ao contrato `onSelect:(servico)=>void`. Painel → N `onSelect`. Item sem código → chip "consultar laboratório" + cadastro inline via `POST /pedidos/servicos/novo`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind (slate/blue + dark), lucide-react, sonner, Vitest (novo, só p/ resolver).

---

## Convenções verificadas no codebase (seguir à risca)

- `Servico` type em `@/app/(dashboard)/pedidos/types`: `{ id:number; codigo:string; codigoLegado?:number|null; categoria:string; nome:string; precoBase:number; precoRotina:number; precoPesquisa:number; tipo?; variante1..5? }`
- `addServico` em `pedidos-guiado/page.tsx` linha 167: `useCallback(async (s: Servico) => Promise<void>, [clienteId, priceKey])` — já resolve preço por cliente e mostra toast.
- `allServicos: Servico[]` carregado no mount (linha 142/146) via `api.get<Servico[]>('/pedidos/servicos')`.
- `isPesquisador: boolean` linha 129.
- `POST /pedidos/servicos/novo` payload (de `CascadingServicoSelector.tsx:92`): `{ codigo:'CUSTOM-'+Date.now(), categoria, nome, precoBase, precoRotina, precoPesquisa, tipo?, variante1..5? }` → retorna `Servico`.
- Design system: `Button` (`variant`,`size`,`loading`), `Badge` (`variant`), `Input` (`label`), `Select` (`label`,`options`). Imports `@/components/ui/*`, `@/lib/api`.
- `CATEGORIA_CORES` map existe em `ServicoSearchInput.tsx` (não exportado — duplicar pequeno helper).
- Estrutura JSON (`/tmp/histocell-handoff/data/histocell/clinical-intelligence.json`):
  - `ihcMarkerIndex: Record<string,{name:string; cliente:{codigo,valorRotina,valorPesquisa}|null; histocell:{...}|null}>` — 326
  - `ihcPainelClinico: Array<{nome:string;icon:string;descricao:string;marcadores:Array<{query:string;markerKey:string;nome:string}>;cobertura:string}>` — 10
  - `coloracaoPorPerguntaClinica: Array<{pergunta:string;icon:string;contexto:string;"colorações":Array<{nome:string;codigo:string;valorRotina:number;valorPesquisa:number}>}>` — 13

Todos os comandos rodam a partir de `apps/web-admin/` salvo indicação.

---

## Mapa de arquivos

| Ação | Arquivo |
|---|---|
| Criar | `src/lib/clinica/clinical-intelligence.json` |
| Criar | `src/lib/clinica/types.ts` |
| Criar | `src/lib/clinica/resolver.ts` |
| Criar | `src/lib/clinica/__tests__/resolver.test.ts` |
| Criar | `vitest.config.ts` |
| Modificar | `package.json` (script test + devDep vitest) |
| Criar | `src/components/clinico/CadastrarServicoInline.tsx` |
| Criar | `src/components/clinico/IHCPanel.tsx` |
| Criar | `src/components/clinico/ColoracaoPanel.tsx` |
| Criar | `src/components/clinico/ClinicoTab.tsx` |
| Modificar | `src/app/(dashboard)/pedidos-guiado/page.tsx` (~6 linhas) |

---

## Task 1: Copiar JSON e definir tipos

**Files:**
- Create: `src/lib/clinica/clinical-intelligence.json`
- Create: `src/lib/clinica/types.ts`

- [ ] **Step 1: Copiar o JSON do handoff**

```bash
mkdir -p src/lib/clinica/__tests__
cp /tmp/histocell-handoff/data/histocell/clinical-intelligence.json src/lib/clinica/clinical-intelligence.json
python3 -c "import json;d=json.load(open('src/lib/clinica/clinical-intelligence.json'));print(len(d['ihcMarkerIndex']),len(d['ihcPainelClinico']),len(d['coloracaoPorPerguntaClinica']))"
# Esperado: 326 10 13
```

- [ ] **Step 2: Criar `src/lib/clinica/types.ts`**

```ts
import type { Servico } from '@/app/(dashboard)/pedidos/types'

// ─── shape do JSON de inteligência clínica ──────────────────────────────────

export interface RawPriced {
  codigo: string
  valorRotina: number
  valorPesquisa: number
}

export interface RawMarker {
  name: string
  cliente: RawPriced | null
  histocell: RawPriced | null
}

export interface RawPanel {
  nome: string
  icon: string
  descricao: string
  marcadores: { query: string; markerKey: string; nome: string }[]
  cobertura: string
}

export interface RawColoracao {
  nome: string
  codigo: string
  valorRotina: number
  valorPesquisa: number
}

export interface RawColoracaoGrupo {
  pergunta: string
  icon: string
  contexto: string
  'colorações': RawColoracao[]
}

export interface ClinicalIntelligenceJson {
  ihcMarkerIndex: Record<string, RawMarker>
  ihcPainelClinico: RawPanel[]
  coloracaoPorPerguntaClinica: RawColoracaoGrupo[]
}

// ─── tipos resolvidos contra o catálogo real ────────────────────────────────

export interface SuggestedServico {
  categoria: string
  precoRotina: number
  precoPesquisa: number
}

export interface ResolvedClinical {
  clinicalName: string
  codigo: string
  servico: Servico | null
  suggested: SuggestedServico
}

export interface IHCMarkerResolved {
  markerKey: string
  clinicalName: string
  histocell: ResolvedClinical | null
  cliente: ResolvedClinical | null
}

export interface IHCPanelResolved {
  nome: string
  descricao: string
  cobertura: string
  marcadores: IHCMarkerResolved[]
}

export interface ColoracaoGrupoResolved {
  pergunta: string
  contexto: string
  coloracoes: ResolvedClinical[]
}

export interface ClinicalIndex {
  ihcMarkers: IHCMarkerResolved[]
  ihcPaineis: IHCPanelResolved[]
  coloracaoGrupos: ColoracaoGrupoResolved[]
}
```

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add apps/web-admin/src/lib/clinica/clinical-intelligence.json apps/web-admin/src/lib/clinica/types.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(clinica): add clinical intelligence JSON asset and domain types

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Configurar Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar Vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

- [ ] **Step 3: Adicionar scripts no `package.json`**

Adicionar ao objeto `"scripts"` (mantendo os existentes `dev`/`build`/`start`/`lint`):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -3
# Esperado: "No test files found" (ok — sem testes ainda)
```

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/web-admin/vitest.config.ts apps/web-admin/package.json apps/web-admin/package-lock.json && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "chore(web-admin): add vitest for resolver unit tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Resolver puro + testes

**Files:**
- Create: `src/lib/clinica/__tests__/resolver.test.ts`
- Create: `src/lib/clinica/resolver.ts`

- [ ] **Step 1: Escrever os testes primeiro (`src/lib/clinica/__tests__/resolver.test.ts`)**

```ts
import { describe, it, expect } from 'vitest'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import {
  indexCatalog, resolveOne, buildClinicalIndex, expandPanel,
} from '../resolver'
import ci from '../clinical-intelligence.json'
import type { ClinicalIntelligenceJson, IHCPanelResolved } from '../types'

function mkServico(p: Partial<Servico> & { id: number; codigo: string }): Servico {
  return {
    id: p.id, codigo: p.codigo, codigoLegado: p.codigoLegado ?? null,
    categoria: p.categoria ?? 'Outros', nome: p.nome ?? 'X',
    precoBase: p.precoBase ?? 0, precoRotina: p.precoRotina ?? 0, precoPesquisa: p.precoPesquisa ?? 0,
  }
}

const SUGGESTED = { categoria: 'Imunohistoquímica', precoRotina: 85, precoPesquisa: 85 }

describe('indexCatalog', () => {
  it('indexa por codigo e codigoLegado', () => {
    const idx = indexCatalog([
      mkServico({ id: 1, codigo: '487', codigoLegado: 487 }),
      mkServico({ id: 2, codigo: 'CUSTOM-9', codigoLegado: null }),
    ])
    expect(idx.byCodigo.get('487')?.id).toBe(1)
    expect(idx.byLegado.get(487)?.id).toBe(1)
    expect(idx.byCodigo.get('CUSTOM-9')?.id).toBe(2)
  })
})

describe('resolveOne', () => {
  const idx = indexCatalog([mkServico({ id: 10, codigo: '487', codigoLegado: 487, nome: 'Imuno MUM1' })])

  it('resolve por codigo string', () => {
    const r = resolveOne('Ki67', '487', SUGGESTED, idx)
    expect(r.servico?.id).toBe(10)
    expect(r.clinicalName).toBe('Ki67')
  })

  it('fallback por codigoLegado quando codigo string não bate', () => {
    const idx2 = indexCatalog([mkServico({ id: 11, codigo: 'CUSTOM-1', codigoLegado: 44 })])
    const r = resolveOne('Ziehl', '44', SUGGESTED, idx2)
    expect(r.servico?.id).toBe(11)
  })

  it('servico null quando não existe (faltante)', () => {
    const r = resolveOne('Inexistente', '99999', SUGGESTED, idx)
    expect(r.servico).toBeNull()
    expect(r.suggested).toEqual(SUGGESTED)
  })
})

describe('buildClinicalIndex', () => {
  const servicos = [
    mkServico({ id: 100, codigo: '487', codigoLegado: 487 }),
    mkServico({ id: 101, codigo: '44',  codigoLegado: 44 }),
  ]
  const index = buildClinicalIndex(servicos, ci as unknown as ClinicalIntelligenceJson)

  it('mantém contagens do JSON', () => {
    expect(index.ihcMarkers).toHaveLength(326)
    expect(index.ihcPaineis).toHaveLength(10)
    expect(index.coloracaoGrupos).toHaveLength(13)
  })

  it('resolve marcador IMUNICANTICORPOHISTOCELLMUM1 (codigo 487) na família histocell', () => {
    const m = index.ihcMarkers.find((x) => x.markerKey === 'IMUNICANTICORPOHISTOCELLMUM1')
    expect(m?.histocell?.servico?.id).toBe(100)
    expect(m?.cliente).toBeNull()
  })

  it('marca coloração sem match como faltante (servico null)', () => {
    const grupo = index.coloracaoGrupos.find((g) =>
      g.coloracoes.some((c) => c.servico === null),
    )
    expect(grupo).toBeTruthy()
  })
})

describe('expandPanel', () => {
  it('expande painel para Servico[] reais pulando faltantes', () => {
    const panel: IHCPanelResolved = {
      nome: 'Teste', descricao: '', cobertura: '2/3',
      marcadores: [
        { markerKey: 'a', clinicalName: 'A',
          histocell: { clinicalName: 'A', codigo: '1', servico: mkServico({ id: 1, codigo: '1' }), suggested: SUGGESTED }, cliente: null },
        { markerKey: 'b', clinicalName: 'B',
          histocell: { clinicalName: 'B', codigo: '2', servico: null, suggested: SUGGESTED }, cliente: null },
        { markerKey: 'c', clinicalName: 'C',
          histocell: null,
          cliente: { clinicalName: 'C', codigo: '3', servico: mkServico({ id: 3, codigo: '3' }), suggested: SUGGESTED } },
      ],
    }
    const hist = expandPanel(panel, false)
    expect(hist.map((s) => s.id)).toEqual([1])
    const cli = expandPanel(panel, true)
    expect(cli.map((s) => s.id)).toEqual([3])
  })
})
```

- [ ] **Step 2: Rodar — verificar que FALHA**

```bash
npm test
# Esperado: FAIL "Cannot find module '../resolver'"
```

- [ ] **Step 3: Criar `src/lib/clinica/resolver.ts`**

```ts
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type {
  ClinicalIntelligenceJson, ClinicalIndex, ResolvedClinical, SuggestedServico,
  IHCMarkerResolved, IHCPanelResolved, ColoracaoGrupoResolved,
} from './types'

export interface CatalogIndex {
  byCodigo: Map<string, Servico>
  byLegado: Map<number, Servico>
}

export function indexCatalog(servicos: Servico[]): CatalogIndex {
  const byCodigo = new Map<string, Servico>()
  const byLegado = new Map<number, Servico>()
  for (const s of servicos) {
    byCodigo.set(s.codigo, s)
    if (s.codigoLegado != null) byLegado.set(s.codigoLegado, s)
  }
  return { byCodigo, byLegado }
}

function lookup(codigo: string, idx: CatalogIndex): Servico | null {
  const direct = idx.byCodigo.get(codigo)
  if (direct) return direct
  const asNum = parseInt(codigo, 10)
  if (!Number.isNaN(asNum)) {
    const legado = idx.byLegado.get(asNum)
    if (legado) return legado
  }
  return null
}

export function resolveOne(
  clinicalName: string,
  codigo: string,
  suggested: SuggestedServico,
  idx: CatalogIndex,
): ResolvedClinical {
  return { clinicalName, codigo, servico: lookup(codigo, idx), suggested }
}

export function buildClinicalIndex(
  servicos: Servico[],
  ci: ClinicalIntelligenceJson,
): ClinicalIndex {
  const idx = indexCatalog(servicos)

  const ihcMarkers: IHCMarkerResolved[] = Object.entries(ci.ihcMarkerIndex).map(
    ([markerKey, raw]) => ({
      markerKey,
      clinicalName: raw.name,
      histocell: raw.histocell
        ? resolveOne(raw.name, raw.histocell.codigo,
            { categoria: 'Imunohistoquímica', precoRotina: raw.histocell.valorRotina, precoPesquisa: raw.histocell.valorPesquisa }, idx)
        : null,
      cliente: raw.cliente
        ? resolveOne(raw.name, raw.cliente.codigo,
            { categoria: 'Imunohistoquímica', precoRotina: raw.cliente.valorRotina, precoPesquisa: raw.cliente.valorPesquisa }, idx)
        : null,
    }),
  )

  const markerByKey = new Map(ihcMarkers.map((m) => [m.markerKey, m]))

  const ihcPaineis: IHCPanelResolved[] = ci.ihcPainelClinico.map((p) => ({
    nome: p.nome,
    descricao: p.descricao,
    cobertura: p.cobertura,
    marcadores: p.marcadores
      .map((mm) => markerByKey.get(mm.markerKey))
      .filter((m): m is IHCMarkerResolved => m != null),
  }))

  const coloracaoGrupos: ColoracaoGrupoResolved[] = ci.coloracaoPorPerguntaClinica.map((g) => ({
    pergunta: g.pergunta,
    contexto: g.contexto,
    coloracoes: g['colorações'].map((c) =>
      resolveOne(c.nome, c.codigo,
        { categoria: 'Coloração Específica', precoRotina: c.valorRotina, precoPesquisa: c.valorPesquisa }, idx),
    ),
  }))

  return { ihcMarkers, ihcPaineis, coloracaoGrupos }
}

export function expandPanel(panel: IHCPanelResolved, clientAntibody: boolean): Servico[] {
  const out: Servico[] = []
  for (const m of panel.marcadores) {
    const fam = clientAntibody ? m.cliente : m.histocell
    const alt = clientAntibody ? m.histocell : m.cliente
    const resolved = (fam && fam.servico) ? fam : (alt && alt.servico ? alt : null)
    if (resolved?.servico) out.push(resolved.servico)
  }
  return out
}
```

- [ ] **Step 4: Rodar — verificar que PASSA**

```bash
npm test
# Esperado: all tests pass
```

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/web-admin/src/lib/clinica/resolver.ts apps/web-admin/src/lib/clinica/__tests__/ && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(clinica): pure resolver crossing clinical JSON with real catalog

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: CadastrarServicoInline

**Files:**
- Create: `src/components/clinico/CadastrarServicoInline.tsx`

Modal de cadastro pré-preenchido a partir de um `ResolvedClinical` faltante. Espelha o `NovoServicoModal` de `CascadingServicoSelector.tsx`.

- [ ] **Step 1: Criar `src/components/clinico/CadastrarServicoInline.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { ResolvedClinical } from '@/lib/clinica/types'

const CATEGORIAS = [
  'Macroscopia','Processamento','Criostato','Cortes Histológico','Cortes Eppendorf',
  'Colorações','Coloração Específica','Imunohistoquímica','Imunofluorescência',
  'Citologia','Análises','Laudos','Imagem','Outros',
  'Descarte/Devolução','IPOG','Insumos/Materiais','Anticorpo','Logística',
  'Consultoria/Serviços','Manutenção',
].map((v) => ({ value: v, label: v }))

interface Props {
  item: ResolvedClinical
  onClose: () => void
  onCriado: (s: Servico) => void
}

export function CadastrarServicoInline({ item, onClose, onCriado }: Props) {
  const [nome, setNome]                   = useState(item.clinicalName)
  const [categoria, setCategoria]         = useState(item.suggested.categoria || 'Outros')
  const [precoRotina, setPrecoRotina]     = useState(String(item.suggested.precoRotina ?? ''))
  const [precoPesquisa, setPrecoPesquisa] = useState(String(item.suggested.precoPesquisa ?? ''))
  const [saving, setSaving]               = useState(false)

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
      })
      toast.success('Serviço criado e adicionado ao pedido!')
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
            Cadastrar serviço clínico
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <strong>{item.clinicalName}</strong> (cód. clínico {item.codigo}) não consta no catálogo.
          Cadastre agora — será adicionado ao pedido e ficará disponível para futuros.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nome do serviço *" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={CATEGORIAS} />
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
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>Cadastrar e adicionar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ../.. && git add apps/web-admin/src/components/clinico/CadastrarServicoInline.tsx && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(clinica): inline create-service modal prefilled from clinical metadata

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: IHCPanel

**Files:**
- Create: `src/components/clinico/IHCPanel.tsx`

- [ ] **Step 1: Criar `src/components/clinico/IHCPanel.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Search, Layers, Plus } from 'lucide-react'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { ClinicalIndex, IHCMarkerResolved, ResolvedClinical } from '@/lib/clinica/types'
import { expandPanel } from '@/lib/clinica/resolver'
import { CadastrarServicoInline } from './CadastrarServicoInline'

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

interface Props {
  index: ClinicalIndex
  onSelect: (s: Servico) => void | Promise<void>
  onServicoCriado: (s: Servico) => void
}

export function IHCPanel({ index, onSelect, onServicoCriado }: Props) {
  const [clientAntibody, setClientAntibody] = useState(false)
  const [query, setQuery]                   = useState('')
  const [cadastro, setCadastro]             = useState<ResolvedClinical | null>(null)

  function activeRes(m: IHCMarkerResolved): ResolvedClinical | null {
    const fam = clientAntibody ? m.cliente : m.histocell
    const alt = clientAntibody ? m.histocell : m.cliente
    return (fam && fam.servico) ? fam : (alt && alt.servico ? alt : (fam ?? alt ?? null))
  }

  const markers = useMemo(() => {
    const q = norm(query.trim())
    const base = q
      ? index.ihcMarkers.filter((m) => norm(m.clinicalName).includes(q) || norm(m.markerKey).includes(q))
      : index.ihcMarkers
    return base.slice(0, q ? 120 : 80)
  }, [index.ihcMarkers, query])

  async function applyPanel(nome: string) {
    const panel = index.ihcPaineis.find((p) => p.nome === nome)
    if (!panel) return
    const servicos = expandPanel(panel, clientAntibody)
    for (const s of servicos) await onSelect(s)
  }

  return (
    <div className="space-y-4">
      {/* Header + toggle A/C */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          {index.ihcMarkers.length} marcadores · painéis clínicos de 1 clique
        </p>
        <button
          onClick={() => setClientAntibody((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5"
        >
          <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">A/C do cliente?</span>
          <span className={`relative inline-block w-9 h-5 rounded-full transition-colors ${clientAntibody ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full transition-all ${clientAntibody ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>

      {/* Painéis */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
          Painéis clínicos
        </p>
        <div className="flex flex-wrap gap-2">
          {index.ihcPaineis.map((p) => (
            <button
              key={p.nome}
              onClick={() => applyPanel(p.nome)}
              title={p.descricao}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
            >
              <Layers className="h-3.5 w-3.5 text-blue-500" />
              {p.nome}
              <span className="text-[10px] text-slate-400">· {p.cobertura}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar marcador (ex: Ki67, CD20, P53…)"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
      </div>

      {/* Marcadores */}
      <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto content-start pr-1">
        {markers.map((m) => {
          const res = activeRes(m)
          const ofertado = !!res?.servico
          if (ofertado) {
            return (
              <button
                key={m.markerKey}
                onClick={() => onSelect(res!.servico!)}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
              >
                {m.clinicalName}
              </button>
            )
          }
          return (
            <button
              key={m.markerKey}
              onClick={() => res && setCadastro(res)}
              title="Não ofertado — clique para cadastrar"
              className="flex items-center gap-1 rounded-full border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-[12px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
            >
              {m.clinicalName}
              <Plus className="h-3 w-3" />
              <span className="text-[10px]">consultar lab</span>
            </button>
          )
        })}
      </div>

      {cadastro && (
        <CadastrarServicoInline
          item={cadastro}
          onClose={() => setCadastro(null)}
          onCriado={(s) => { onServicoCriado(s); onSelect(s) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ../.. && git add apps/web-admin/src/components/clinico/IHCPanel.tsx && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(clinica): IHC panel UI with 1-click panels, search and A/C toggle

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: ColoracaoPanel

**Files:**
- Create: `src/components/clinico/ColoracaoPanel.tsx`

- [ ] **Step 1: Criar `src/components/clinico/ColoracaoPanel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import type { ClinicalIndex, ResolvedClinical } from '@/lib/clinica/types'
import { CadastrarServicoInline } from './CadastrarServicoInline'

interface Props {
  index: ClinicalIndex
  onSelect: (s: Servico) => void | Promise<void>
  onServicoCriado: (s: Servico) => void
}

export function ColoracaoPanel({ index, onSelect, onServicoCriado }: Props) {
  const [open, setOpen]         = useState<Record<string, boolean>>({})
  const [cadastro, setCadastro] = useState<ResolvedClinical | null>(null)

  return (
    <div className="space-y-2">
      <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-1">
        Colorações organizadas pela pergunta clínica — sem decorar o nome da técnica.
      </p>

      {index.coloracaoGrupos.map((g) => {
        const isOpen = !!open[g.pergunta]
        return (
          <div key={g.pergunta} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setOpen((o) => ({ ...o, [g.pergunta]: !o[g.pergunta] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
            >
              <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                {g.pergunta}
                <span className="ml-2 text-[11px] font-normal text-slate-400">· {g.contexto}</span>
              </span>
              {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>

            {isOpen && (
              <div className="p-3 flex flex-wrap gap-2">
                {g.coloracoes.map((c) => {
                  const ofertado = !!c.servico
                  if (ofertado) {
                    return (
                      <button
                        key={c.codigo + c.clinicalName}
                        onClick={() => onSelect(c.servico!)}
                        className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                      >
                        {c.clinicalName}
                      </button>
                    )
                  }
                  return (
                    <button
                      key={c.codigo + c.clinicalName}
                      onClick={() => setCadastro(c)}
                      title="Não ofertado — clique para cadastrar"
                      className="flex items-center gap-1 rounded-full border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-[12px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
                    >
                      {c.clinicalName}
                      <Plus className="h-3 w-3" />
                      <span className="text-[10px]">consultar lab</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {cadastro && (
        <CadastrarServicoInline
          item={cadastro}
          onClose={() => setCadastro(null)}
          onCriado={(s) => { onServicoCriado(s); onSelect(s) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ../.. && git add apps/web-admin/src/components/clinico/ColoracaoPanel.tsx && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(clinica): coloracao panel grouped by clinical question

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: ClinicoTab (shell)

**Files:**
- Create: `src/components/clinico/ClinicoTab.tsx`

- [ ] **Step 1: Criar `src/components/clinico/ClinicoTab.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Dna, Palette } from 'lucide-react'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import { buildClinicalIndex } from '@/lib/clinica/resolver'
import type { ClinicalIntelligenceJson } from '@/lib/clinica/types'
import ciJson from '@/lib/clinica/clinical-intelligence.json'
import { IHCPanel } from './IHCPanel'
import { ColoracaoPanel } from './ColoracaoPanel'

type SubTab = 'ihc' | 'coloracao'

interface Props {
  servicos: Servico[]
  onSelect: (s: Servico) => void | Promise<void>
  onServicoCriado: (s: Servico) => void
}

export function ClinicoTab({ servicos, onSelect, onServicoCriado }: Props) {
  const [sub, setSub] = useState<SubTab>('ihc')

  const index = useMemo(
    () => buildClinicalIndex(servicos, ciJson as unknown as ClinicalIntelligenceJson),
    [servicos],
  )

  const subTabs: { key: SubTab; label: string; icon: React.ElementType }[] = [
    { key: 'ihc',       label: 'Imunohistoquímica', icon: Dna },
    { key: 'coloracao', label: 'Colorações',        icon: Palette },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {subTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSub(key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              sub === key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {sub === 'ihc' && (
        <IHCPanel index={index} onSelect={onSelect} onServicoCriado={onServicoCriado} />
      )}
      {sub === 'coloracao' && (
        <ColoracaoPanel index={index} onSelect={onSelect} onServicoCriado={onServicoCriado} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npx tsc --noEmit 2>&1 | tail -10
# Esperado: sem erros nos arquivos src/components/clinico/* e src/lib/clinica/*
```

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add apps/web-admin/src/components/clinico/ClinicoTab.tsx && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(clinica): ClinicoTab shell with IHC/Coloracao sub-navigation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Integrar no pedidos-guiado

**Files:**
- Modify: `src/app/(dashboard)/pedidos-guiado/page.tsx`

Mudança cirúrgica (~6 pontos). Não alterar nenhum outro comportamento.

- [ ] **Step 1: Adicionar import do ícone e do componente**

Em `src/app/(dashboard)/pedidos-guiado/page.tsx`, linha 4-7 (bloco de import do lucide), adicionar `Stethoscope` à lista de ícones importados de `lucide-react`. Depois da linha 14 (`import { ServicoSearchInput } ...`), adicionar:

```tsx
import { ClinicoTab } from '@/components/clinico/ClinicoTab'
```

Resultado do import lucide (linhas 4-7):
```tsx
import {
  Flame, Star, Clock, GitBranch, Plus, Trash2,
  AlertCircle, ChevronDown, CheckCircle2, Send, Stethoscope,
} from 'lucide-react'
```

- [ ] **Step 2: Adicionar `'clinico'` ao type Tab**

Linha 20, trocar:
```tsx
type Tab = 'populares' | 'favoritos' | 'historico' | 'guiado'
```
por:
```tsx
type Tab = 'populares' | 'favoritos' | 'historico' | 'guiado' | 'clinico'
```

- [ ] **Step 3: Adicionar o botão da aba**

No array de tabs (linhas 317-322), depois da entrada `guiado`, adicionar a entrada `clinico`. O array fica:

```tsx
                [
                  { key: 'populares', label: 'Populares', icon: Flame },
                  { key: 'favoritos', label: 'Favoritos', icon: Star },
                  { key: 'historico', label: 'Histórico',  icon: Clock },
                  { key: 'guiado',   label: 'Guiado',     icon: GitBranch },
                  { key: 'clinico',  label: 'Clínico',    icon: Stethoscope },
                ] as { key: Tab; label: string; icon: React.ElementType }[]
```

- [ ] **Step 4: Adicionar o branch de render**

Depois do bloco `{tab === 'guiado' && ( ... )}` (linhas 442-447), antes do fechamento `</div>` do "Tab body", adicionar:

```tsx
              {/* Clínico */}
              {tab === 'clinico' && (
                <ClinicoTab
                  servicos={allServicos}
                  onSelect={addServico}
                  onServicoCriado={(s) => setAllServicos((prev) => [s, ...prev])}
                />
              )}
```

- [ ] **Step 5: Typecheck + build**

```bash
npx tsc --noEmit 2>&1 | tail -5
npm run build 2>&1 | tail -15
# Esperado: tsc sem erros; build "Compiled successfully" / sem erro na rota /pedidos-guiado
```

- [ ] **Step 6: Commit**

```bash
cd ../.. && git add apps/web-admin/src/app/\(dashboard\)/pedidos-guiado/page.tsx && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(clinica): wire Clinico tab into pedido guiado

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Smoke test + push

- [ ] **Step 1: Rodar a suíte de testes**

```bash
cd apps/web-admin && npm test
# Esperado: all tests pass
```

- [ ] **Step 2: Subir dev e validar manualmente** (se possível no ambiente)

```bash
cd ../.. && npm run dev:admin
# http://localhost:3002/pedidos-guiado
```

Validar:
1. As 4 abas originais (Populares/Favoritos/Histórico/Guiado) continuam funcionando.
2. Aba "Clínico" aparece; sub-nav IHC/Colorações alterna.
3. Clicar painel "Mama (carcinoma)" adiciona os marcadores resolvidos ao resumo à direita (toast por item).
4. Toggle "A/C do cliente?" muda a família resolvida.
5. Aba Colorações: abrir um grupo, clicar uma coloração resolvida → entra no carrinho.
6. Um chip "consultar lab" abre o modal de cadastro pré-preenchido; cadastrar adiciona ao pedido.
7. Selecionar cliente + Enviar Pedido → `POST /pedidos` funciona (inalterado).

- [ ] **Step 3: Push da branch**

```bash
git push -u origin claude/histocell-services-documentation-qr5Qi
```

- [ ] **Step 4: Confirmar no remoto**

```bash
git log origin/claude/histocell-services-documentation-qr5Qi --oneline -8
```
