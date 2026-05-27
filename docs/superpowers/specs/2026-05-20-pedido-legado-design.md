# Pedido Legado — Design Spec

**Data:** 2026-05-20
**App:** monorepo histocell-3 (`apps/api` NestJS+Prisma, `apps/web-admin` Next.js 14)

---

## 1. Objetivo

Adicionar um **terceiro modo de lançar pedido**: "Pedido Legado", ao lado de "Pedido" (`/pedidos`) e "Pedido Guiado" (`/pedidos-guiado`). A tela apresenta o catálogo de serviços no **formato da planilha legada** (`base-original.xlsx`: `Categoria · Serviço Base · Variante 1-5 · Código · Valor Rotina · Valor Pesquisa · Observações`), permite montar e enviar o pedido, e oferece **CRUD de serviço** como ação auxiliar (editar, arquivar, deletar, criar quando não existe).

---

## 2. Decisões travadas

| Tema | Decisão |
|---|---|
| Propósito da tela | Lançar pedido (cliente + carrinho + `POST /pedidos`), igual ao Pedido Guiado, mas em formato-legado. CRUD de serviço é auxiliar |
| Arquivar | `ativo = false` (reversível, some da busca; reaparece com "mostrar arquivados") |
| Deletar | Hard delete **só se** o serviço nunca foi usado (`ItemPedido`/`ItemOrcamento`). Em uso → `409`, instrui a arquivar |
| Apresentação | Tabela única + busca (código/nome) + pills de categoria + toggle "mostrar arquivados"; digitar código exato foca a linha |
| Observações | Adicionar campo `observacoes String?` ao `Servico` (migration); editar/criar cobre todos os campos legados |
| Reuso de carrinho | Extrair `useOrderCart` da lógica inline do Pedido Guiado; ambas as telas consomem o hook |
| Localização backend | Endpoints de serviço continuam sob `/pedidos` (padrão atual) |

---

## 3. Backend (`apps/api`)

### 3.1 Migration Prisma

`schema.prisma` — adicionar ao model `Servico`:
```prisma
observacoes String? @db.Text
```
`npx prisma migrate dev --name servico_observacoes` + `prisma generate`.

### 3.2 Endpoints (em `pedidos.controller.ts`)

| Método | Rota | Roles | Comportamento |
|---|---|---|---|
| `GET` | `/pedidos/servicos` (estendido) | gerencia, recepcao, tecnico, financeiro | Query opcional `busca`, `categoria`, `incluirInativos`. Sem params → ativos (comportamento atual preservado). `incluirInativos=true` → inclui arquivados |
| `PATCH` | `/pedidos/servicos/:id` | gerencia, recepcao | Edita `nome, categoria, variante1..5, codigo, precoRotina, precoPesquisa, observacoes`. `precoBase` segue `precoRotina` |
| `PATCH` | `/pedidos/servicos/:id/arquivar` | gerencia, recepcao | Body `{ ativo: boolean }` → seta `ativo` |
| `DELETE` | `/pedidos/servicos/:id` | gerencia | Conta `itensPedido` + `itensOrcamento`. Se 0 → delete. Se >0 → `ConflictException` (409) "Serviço em uso, arquive" |
| `POST` | `/pedidos/servicos/novo` (estendido) | gerencia, recepcao | Já existe; passa a aceitar `observacoes` |

### 3.3 DTOs (`apps/api/src/pedidos/dto/`)

```ts
// update-servico.dto.ts
export class UpdateServicoDto {
  @IsOptional() @IsString() nome?: string
  @IsOptional() @IsString() categoria?: string
  @IsOptional() @IsString() codigo?: string
  @IsOptional() @IsNumber() @Min(0) precoRotina?: number
  @IsOptional() @IsNumber() @Min(0) precoPesquisa?: number
  @IsOptional() @IsString() observacoes?: string
  @IsOptional() @IsString() variante1?: string
  @IsOptional() @IsString() variante2?: string
  @IsOptional() @IsString() variante3?: string
  @IsOptional() @IsString() variante4?: string
  @IsOptional() @IsString() variante5?: string
}

// arquivar-servico.dto.ts
export class ArquivarServicoDto {
  @IsBoolean() ativo: boolean
}

// filter-servico.dto.ts
export class FilterServicoDto {
  @IsOptional() @IsString() busca?: string
  @IsOptional() @IsString() categoria?: string
  @IsOptional() @IsBooleanString() incluirInativos?: string
}
```

### 3.4 Service (`pedidos.service.ts`)

- `listarServicos(filter?: FilterServicoDto)` — `where.ativo` só quando `!incluirInativos`; `busca` casa `nome`/`codigo`/`codigoLegado`; `categoria` exato.
- `atualizarServico(id, dto: UpdateServicoDto)` — valida unicidade de `codigo` (exceto o próprio registro); seta `precoBase = precoRotina` quando `precoRotina` muda.
- `arquivarServico(id, ativo: boolean)`.
- `removerServico(id)` — `count` de `itemPedido`+`itemOrcamento` por `servicoId`; >0 → `ConflictException`. Se 0: numa `prisma.$transaction`, remove primeiro as dependências seguras (`servicoFavorito`, `tabelaPreco` desse `servicoId` — preferências de usuário / overrides de preço, sem valor histórico) e então `delete` do serviço. Isso evita erro de FK por favoritos/tabela de preço residuais.
- `criarServico` (existente) — incluir `observacoes` no payload aceito.

**Validação cross-tenant/integridade:** o DELETE nunca remove serviço referenciado. Unicidade de `codigo` mantida no update.

---

## 4. Frontend (`apps/web-admin`)

### 4.1 Hook compartilhado `src/hooks/useOrderCart.ts`

Extrai a lógica de carrinho hoje inline em `pedidos-guiado/page.tsx`, **sem mudança de comportamento**:

```ts
export interface OrderCartItem {
  key: string; servicoId: number; nome: string; categoria: string
  quantidade: number; preco: number; desconto: number
}
export function useOrderCart() {
  // estado: clienteId, observacoes, itens, saving, saved, clientes
  // derivados: cliente, isPesquisador, totalGeral, itemSubtotal()
  // ações: setClienteId, setObservacoes, addServico(s), removeItem(key),
  //        updateItem(key, 'quantidade'|'preco'|'desconto', value),
  //        handleSalvar('rascunho'|'enviado'), reset()
}
```
`addServico` mantém: preço inicial por `isPesquisador`, override por `GET /pedidos/preco?clienteId&servicoId`, toast. `handleSalvar` mantém `POST /pedidos` com `{clienteId, observacoes, status, itens}`.

`pedidos-guiado/page.tsx` é refatorado para consumir o hook (as 5 abas e o resumo continuam idênticos).

### 4.2 Página `src/app/(dashboard)/pedidos-legado/page.tsx`

Layout 2 colunas (espelha o guiado): esquerda = seletor de cliente + `ServicoLegadoTable`; direita = resumo do pedido (do `useOrderCart`, mesmo markup do guiado).

### 4.3 `src/components/legado/ServicoLegadoTable.tsx`

- Carrega serviços via `GET /pedidos/servicos?busca&categoria&incluirInativos`
- Colunas: Categoria · Serviço Base · Variantes (concatenadas) · Código · Valor Rotina · Valor Pesquisa · Ações
- Busca (código/nome accent-insensitive) + pills de categoria (reusa `CATEGORIA_CORES`) + toggle "mostrar arquivados"
- Digitar código exato → foca/realça a linha
- Preço exibido conforme `isPesquisador` (do cliente selecionado)
- Ações por linha: **＋ Adicionar** (`addServico`), **✎ Editar**, **🗄 Arquivar/Desarquivar** (`PATCH .../arquivar`), **🗑 Deletar** (`DELETE`, trata 409)
- Linhas arquivadas esmaecidas quando exibidas
- "Criar novo" quando a busca não retorna resultado

### 4.4 `src/components/legado/ServicoFormModal.tsx`

Modal único editar/criar (estende o padrão do `NovoServicoModal`):
- Campos: Categoria (Select), Serviço Base (Input nome), Variante 1-5, Código, Valor Rotina, Valor Pesquisa, Observações (textarea)
- Modo criar → `POST /pedidos/servicos/novo`; modo editar → `PATCH /pedidos/servicos/:id`
- On success: toast + refetch da tabela

### 4.5 Menu `src/app/(dashboard)/layout.tsx`

Adicionar item **"Pedido Legado"** (ícone `FileSpreadsheet`) logo após "Pedido Guiado".

---

## 5. Tipos compartilhados

Reusa `Servico` de `@/app/(dashboard)/pedidos/types` (adicionar `observacoes?: string | null` ao type). `OrderCartItem` no hook.

---

## 6. Convenções (seguir à risca)

`'use client'`; ícones `lucide-react`; toasts `sonner`; `@/components/ui/*`, `@/lib/api`; Tailwind slate/blue + `dark:`; BRL `toLocaleString('pt-BR',{style:'currency',currency:'BRL'})`; backend NestJS `@Roles` + class-validator + `PrismaService`, `Decimal`→`Number` nas respostas, sub-rotas fixas antes de `:id`.

---

## 7. Fora de escopo

- Importar a planilha `base-original.xlsx` para o banco (o catálogo já está seedado)
- Edição em massa / undo
- Histórico/auditoria de alterações de serviço (além do audit log existente, se houver)
- Paginação server-side da tabela (catálogo ~641 itens cabe em filtro client-side; usar mesmo padrão do `ServicoSearchInput`)

---

## 8. Critérios de sucesso

1. Item "Pedido Legado" no menu abre `/pedidos-legado` sem quebrar as rotas existentes
2. Tabela mostra serviços no formato legado; busca por código foca a linha
3. Adicionar serviço ao carrinho → resumo e total corretos (preço por cliente)
4. Editar serviço persiste via `PATCH`; criar novo via `POST`; arquivar alterna `ativo`; deletar serviço em uso retorna 409 com aviso
5. Enviar pedido funciona via `POST /pedidos` (mesmo contrato)
6. Pedido Guiado continua idêntico após o refactor do `useOrderCart`
7. `tsc --noEmit` limpo e `npm run build` OK
