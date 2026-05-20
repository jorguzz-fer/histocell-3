# Camada de Inteligência Clínica no Pedido Guiado — Design Spec

**Data:** 2026-05-19
**Branch:** `claude/histocell-services-documentation-qr5Qi`
**Fase:** 1 — IHC (marcadores + painéis) e Colorações por pergunta clínica
**App:** `apps/web-admin` (Next.js 14 App Router + TypeScript + Tailwind)

---

## 1. Objetivo

O catálogo real (`Servico`, 641 itens) é plano e sem semântica clínica: os 355 serviços IHC têm o marcador embutido como texto livre em `nome`, e as ~40 colorações especiais são **todas** literalmente chamadas `"Especificas"` (códigos distintos, mesmo preço, indistinguíveis). A recepção não consegue, a partir de um pedido médico ("painel de mama", "pesquisa de BAAR"), achar o código certo.

Esta entrega adiciona uma **camada de inteligência clínica curada** (do handoff, extraída de `Histocell-serviços.xlsx`) que mapeia intenção clínica → códigos reais, como uma nova aba na página guiada existente.

---

## 2. Decisões travadas

| Decisão | Escolha |
|---|---|
| Onde vive a inteligência | **Frontend-only**, resolver estático. `clinical-intelligence.json` é asset do `web-admin`, cruzado em runtime com `GET /pedidos/servicos` |
| Encaixe na UI | **1 aba nova "Clínico"** (5ª) em `pedidos-guiado/page.tsx`, com sub-navegação interna (IHC \| Colorações) |
| Item sem código real | Chip desabilitado "consultar laboratório" + ação **"Cadastrar serviço"** reusando `POST /pedidos/servicos/novo` pré-preenchido |
| Escopo fase 1 | **IHC marcadores+painéis** e **Colorações por pergunta clínica**. Macroscopia e IF/Citologia = fase 2 |
| Estrutura de código | Componente isolado + módulo resolver puro (espelha `CascadingServicoSelector`) |
| Preço / finalidade | **Não** reimplementado. `addServico` nativo já resolve preço por `cliente.segmento` + `GET /pedidos/preco` |

---

## 3. Fluxo de dados

```
Mount aba "Clínico"
  ├─ api.get('/pedidos/servicos') → Servico[] real
  └─ import clinical-intelligence.json (asset)
        ▼
  buildClinicalIndex(servicos, intelligence)   ← puro, useMemo([servicos])
        ▼
  ClinicalIndex { ihcMarkers[], ihcPaineis[], coloracaoGrupos[] }
     cada item resolvido: { ...metaClínica, servico: Servico | null }
        │
  clique marcador / painel / coloração
     ├─ servico ≠ null → onSelect(servico) → addServico() nativo
     │                    (painel = N onSelect em sequência)
     └─ servico = null → chip "consultar laboratório"
                          + "Cadastrar serviço" → POST /pedidos/servicos/novo
                             (pré-preenchido) → re-resolve → onSelect
```

**Chave de cruzamento:** JSON clínico tem `codigo: string` (ex "487"). `Servico` real tem `codigo: string` e `codigoLegado: number`. Resolver tenta `codigo` primeiro, depois `codigoLegado` (via `parseInt`). Verificado: código `10` (Descalcificação, R$6/R$7) bate exatamente entre handoff e seed.

A camada clínica **não decide preço** — só resolve qual `servicoId`. `addServico` cuida do resto.

---

## 4. Estrutura de arquivos

```
apps/web-admin/src/
├── lib/clinica/
│   ├── clinical-intelligence.json    ← copiado do handoff
│   ├── types.ts                       ← tipos do domínio clínico resolvido
│   └── resolver.ts                    ← funções puras (testáveis)
│
├── components/clinico/
│   ├── ClinicoTab.tsx                 ← shell: carrega servicos, monta index, sub-nav
│   ├── IHCPanel.tsx                   ← painéis 1-clique + busca + toggle A/C cliente
│   ├── ColoracaoPanel.tsx             ← acordeão por pergunta clínica
│   └── CadastrarServicoInline.tsx     ← wrapper de POST /pedidos/servicos/novo pré-preenchido
│
└── app/(dashboard)/pedidos-guiado/page.tsx   ← MODIFICADO (~6 linhas)
```

`pedidos-guiado/page.tsx` muda cirurgicamente:
- `type Tab` ganha `'clinico'`
- 1 botão de aba (ícone `lucide-react`, ex `Dna` ou `FlaskConical`)
- 1 branch de render: `<ClinicoTab isPesquisador={isPesquisador} onSelect={addServico} servicos={allServicos} />`

`ClinicoTab` conforma ao mesmo contrato do `CascadingServicoSelector`: `onSelect: (servico: Servico) => void`. O pipeline de preço/resumo/submit é reaproveitado **sem alteração**.

---

## 5. Tipos (`lib/clinica/types.ts`)

```ts
import type { Servico } from '@/app/(dashboard)/pedidos/types'

export interface SuggestedServico {
  categoria: string
  precoRotina: number
  precoPesquisa: number
}

export interface ResolvedClinical {
  clinicalName: string           // nome clínico curado (ex "Ki67", "Ziehl-Neelsen")
  codigo: string                 // código do handoff
  servico: Servico | null        // null = não ofertado no catálogo real
  suggested: SuggestedServico    // metadados p/ cadastro inline
}

export interface IHCMarkerResolved {
  markerKey: string
  clinicalName: string
  histocell: ResolvedClinical | null   // resolução A/C Histocell
  cliente: ResolvedClinical | null     // resolução A/C cliente
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

---

## 6. Resolver (`lib/clinica/resolver.ts`)

| Função | Assinatura | Responsabilidade |
|---|---|---|
| `indexCatalog` | `(servicos: Servico[]) → { byCodigo: Map<string,Servico>; byLegado: Map<number,Servico> }` | Lookup O(1) por código |
| `resolveOne` | `(codigo: string, suggested: SuggestedServico, idx) → ResolvedClinical` | Cruza 1 código → Servico ou null |
| `resolveMarker` | `(key, entry, idx) → IHCMarkerResolved` | Resolve as duas famílias (histocell/cliente) |
| `buildClinicalIndex` | `(servicos: Servico[], intelligence) → ClinicalIndex` | Resolve marcadores, painéis, colorações |
| `expandPanel` | `(panel: IHCPanelResolved, clientAntibody: boolean) → Servico[]` | Painel → Servico[] reais (pula faltantes) |

Funções puras, sem React/API. `clinical-intelligence.json` copiado do handoff (`/tmp/histocell-handoff/data/histocell/clinical-intelligence.json`). Estrutura de origem:
- `ihcMarkerIndex: Record<key, { name, cliente|null, histocell|null }>` (326 entradas)
- `ihcPainelClinico: Array<{ nome, descricao, cobertura, marcadores[] }>` (10 painéis)
- `coloracaoPorPerguntaClinica: Array<{ pergunta, contexto, colorações[] }>`

`buildClinicalIndex` roda 1× via `useMemo(() => buildClinicalIndex(servicos, ci), [servicos])`.

---

## 7. UI da aba "Clínico"

`ClinicoTab` (shell):
- No mount, recebe `servicos: Servico[]` (já carregado pelo `pedidos-guiado` como `allServicos`) — **sem fetch extra**
- `useMemo` monta `ClinicalIndex`
- Sub-nav (2 botões pill): **IHC** | **Colorações** (segue estilo das abas existentes)
- Renderiza `<IHCPanel>` ou `<ColoracaoPanel>` conforme sub-nav

`IHCPanel`:
- Toggle "A/C do cliente?" (decide qual família resolver: `histocell` vs `cliente`)
- Painéis clínicos como chips de 1 clique → `expandPanel` → N× `onSelect`
- Busca de marcador (filtro client-side accent-insensitive sobre `clinicalName`/`markerKey`)
- Chips de marcador: resolvido = clicável (teal), faltante = cinza "consultar laboratório" + "Cadastrar"

`ColoracaoPanel`:
- Acordeão por pergunta clínica (`pergunta` + `contexto`)
- Dentro de cada grupo, chips de coloração: resolvido clicável, faltante cinza + "Cadastrar"

`CadastrarServicoInline`:
- Aberto a partir de um chip faltante
- Pré-preenche nome (clínico), categoria, precoRotina/precoPesquisa do `suggested`
- `POST /pedidos/servicos/novo` (endpoint existente; codigo gerado `CUSTOM-${Date.now()}` como o padrão atual)
- On success: `toast.success`, atualiza o catálogo local, re-resolve, e dispara `onSelect` do item recém-criado

Convenções obrigatórias: `'use client'`, ícones `lucide-react`, toasts `sonner`, imports `@/components/ui/*`, `@/lib/api`, Tailwind slate/blue + `dark:`, helper BRL `toLocaleString('pt-BR',{style:'currency',currency:'BRL'})`, divisores `// ─── … ───`. Reusar `CATEGORIA_CORES` de `ServicoSearchInput.tsx` para cor por categoria.

---

## 8. Testes

O projeto não tem framework de teste. Adicionar **Vitest** (`apps/web-admin`), config com alias `@`. Cobertura focada no resolver puro:
- `resolveOne`: match por `codigo`; fallback por `codigoLegado`; faltante (`servico: null`)
- `resolveMarker`: famílias histocell/cliente independentes
- `expandPanel`: mistura resolvido + faltante (faltantes não entram)
- `buildClinicalIndex`: contagens (326 marcadores, 10 painéis) e shape

Sem testes de UI nesta fase.

---

## 9. Fora de escopo (fase 1)

- Macroscopia resolver (nº frascos, tipo material, auto-anexar descalcificação) → fase 2
- Imunofluorescência / Citologia → fase 2
- Modelos Prisma / endpoints backend para inteligência clínica
- Edição/curadoria da camada clínica via UI
- Persistência da camada clínica no banco

---

## 10. Critérios de sucesso

1. Aba "Clínico" aparece em `/pedidos-guiado` sem quebrar as 4 abas existentes
2. Clicar painel "Mama" adiciona os 4 marcadores reais resolvidos ao resumo, com preço correto via pipeline nativo
3. Coloração resolvida (ex Ziehl-Neelsen → código real) entra no carrinho com `servicoId` correto
4. Marcador não ofertado mostra "consultar laboratório" e permite cadastrar na hora
5. Submit do pedido funciona inalterado (mesmo `POST /pedidos`)
6. `npm test` no `web-admin` passa (resolver coberto)
