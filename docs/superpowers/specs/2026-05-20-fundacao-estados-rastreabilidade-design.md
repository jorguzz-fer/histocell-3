# Spec 1A — Fundação: Estados, Divergência, Fila e Audit

**Data:** 2026-05-20
**Branch:** main
**App:** monorepo histocell-3 (`apps/api` NestJS+Prisma, `apps/web-admin` Next.js 14)

---

## 1. Objetivo

Habilitar o fluxo operacional discutido com Cleber e Célio nas reuniões: recepção recebe pedido → sistema **auto-cria Ordens de Serviço por amostra** na etapa `macroscopia` → macro registra contagem real → se divergir do orçado, pedido aguarda **aprovação da gerência** antes de virar cobrança → fila por etapa visível em `/fila`, com filtro "minhas tarefas" → **toda transição entra no `AuditLog`** (hoje 100% sem uso).

Esta é a **Spec 1A**. A impressão da OS em papel + integração com etiquetas + tela do macroscopista com orçado lado-a-lado ficam na **Spec 1B**, que depende de artefatos visuais e refino do template (modelo da OS legada do Cérebro recebido, mas será trabalhado em seguida).

---

## 2. Contexto descoberto na exploração

O modelo de dados já tem mais do que aparenta:

| Modelo | Campo | Estado hoje |
|---|---|---|
| `Pedido.status` | `rascunho · enviado · recebido · cancelado` | Em uso |
| `Amostra.status` | `pendente · em_processamento · concluida · rejeitada` | Em uso (subutilizado na UI) |
| `OrdemServico.etapaAtual` | `triagem · macroscopia · processamento · laudo` | Em uso, mas sem fila visível |
| `OrdemServico.responsavel: String?` | texto livre | Bloqueia "minha fila" |
| `AuditService` | infraestrutura completa | **Não é chamado em lugar nenhum** |
| `OrdemServico.amostraId @unique` | 1 OS por amostra | Mantém — a "OS impressa" do papel é agregação |
| Recebimento → OS | manual via `/ordens` | Vira automático nesta spec |

A "OS Nº 67593" do Cérebro (artefato em foto) é **uma OS impressa por pedido**, agregando várias amostras × serviços. Nosso modelo permanece granular per-amostra; a impressão (Spec 1B) será um agregador.

---

## 3. Decisões travadas (do brainstorming)

| # | Tema | Decisão |
|---|---|---|
| 1 | Granularidade da divergência | **Por pedido inteiro** (total amostras vs `sum(itens.quantidade)`). Sem FK `Amostra→ItemPedido` por enquanto |
| 2 | Quem aprova divergência | **Apenas `gerencia`** |
| 3 | `responsavel` | **FK aditiva** `responsavelUserId` ao lado do `responsavel: String?` existente |
| 4 | Dashboard de pendências | **Nova rota `/fila`** com seções por etapa + toggle "Só meus" |
| 5 | Auto-criação de OS no recebimento | **Sim** — 1 OS por amostra, começa em `macroscopia` |
| 6 | Campo `geraEtiqueta` no Servico | **Adicionar** — Cleber marca on-demand, default `false` em tudo |
| 7 | Conteúdo da OS impressa (template) | **Spec 1B** |
| 8 | Bipagem de conferência final | **Backlog futuro** |

---

## 4. Backend (`apps/api`)

### 4.1 Migration Prisma

`schema.prisma` — alterações aditivas no model `Servico`, `Pedido`, `OrdemServico`, `EtapaOS`, e o relacionamento reverso em `User`:

```prisma
model Servico {
  // ...campos existentes
  geraEtiqueta  Boolean @default(false)
}

model Pedido {
  // ...campos existentes
  contagemDivergente Boolean @default(false)
}

model OrdemServico {
  // ...campos existentes
  responsavelUserId Int?
  responsavelUser   User?  @relation("OSResponsavel", fields: [responsavelUserId], references: [id])
  @@index([responsavelUserId])
}

model EtapaOS {
  // ...campos existentes
  responsavelUserId Int?
  responsavelUser   User?  @relation("EtapaResponsavel", fields: [responsavelUserId], references: [id])
}

model User {
  // ...campos existentes
  ordensResponsavel OrdemServico[] @relation("OSResponsavel")
  etapasResponsavel EtapaOS[]      @relation("EtapaResponsavel")
}
```

`STATUS_VALIDOS` em `pedidos.service.ts` ganha `'recebido_pendente_aprovacao'`. Aplicação via `prisma db push` no deploy (padrão do projeto, conforme `apps/api/Dockerfile`).

### 4.2 Endpoints

#### Alterado: `POST /recebimento/receber`

Comportamento novo dentro de `RecebimentoService.receberPedido` (após `prisma.amostra.createMany`):

1. **Auto-criar OS por amostra** — `RecebimentoService` passa a injetar `OrdensService` e chama um novo método público dedicado, evitando duplicar a lógica de geração do `numero`:
   ```ts
   // ordens.service.ts (novo método)
   async criarAuto(amostraId: number, etapaInicial = 'macroscopia') {
     return this.prisma.ordemServico.create({
       data: {
         amostraId,
         numero: await this.gerarNumero(),                     // método privado já existente
         etapaAtual: etapaInicial,
         status: 'em_andamento',
         prioridade: 'normal',
         etapas: { create: { etapa: etapaInicial, status: 'em_andamento', iniciadoEm: new Date() } },
       },
     });
   }

   // recebimento.service.ts (uso)
   for (const amostra of amostrasCriadas) {
     await this.ordens.criarAuto(amostra.id, 'macroscopia');
   }
   ```
   `RecebimentoModule` passa a importar `OrdensModule`; `OrdensModule` exporta `OrdensService`.
2. **Computar divergência**:
   ```ts
   const totalOrcado = pedido.itens.reduce((s, i) => s + i.quantidade, 0);
   const totalRecebido = amostrasCriadas.length;
   const divergente = totalRecebido !== totalOrcado;
   ```
3. **Decidir status do pedido**:
   ```ts
   const novoStatus = divergente ? 'recebido_pendente_aprovacao' : 'recebido';
   await this.prisma.pedido.update({
     where: { id: pedidoId },
     data: { status: novoStatus, contagemDivergente: divergente, dataRecebimento: new Date() },
   });
   ```
4. **Audit log**: `await this.audit.log(userId, divergente ? 'RECEBIDO_PENDENTE_APROVACAO' : 'RECEBIDO', 'Pedido', pedidoId, JSON.stringify({ totalOrcado, totalRecebido, divergente }))`

Sem mudança no contrato de request/response.

#### Novo: `PATCH /pedidos/:id/aprovar-divergencia`

```ts
@Patch(':id/aprovar-divergencia')
@Roles('gerencia')
aprovarDivergencia(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
  return this.service.aprovarDivergencia(id, req.user.sub ?? req.user.userId ?? req.user.id);
}
```

`PedidosService.aprovarDivergencia(id, userId)`:
- Valida que o pedido existe e está em `recebido_pendente_aprovacao`. Se não, `BadRequestException`.
- Transiciona para `recebido` (mantém `contagemDivergente=true` como histórico).
- Audit log: action=`DIVERGENCIA_APROVADA`, details com `{ aprovadoPor: userId }`.

#### Novo: `GET /fila`

```ts
@Get('fila')
@Roles('gerencia', 'recepcao', 'tecnico')
getFila(@Query('soMeus') soMeus?: string, @Request() req?: any) {
  const userId = soMeus === 'true' ? (req.user.sub ?? req.user.userId ?? req.user.id) : undefined;
  return this.service.getFila(userId);
}
```

Vive num novo módulo `fila/` (`apps/api/src/fila/`). `FilaService.getFila(userId?)` retorna:

```ts
{
  counts: { aprovacaoDivergencia: number, macroscopia: number, processamento: number, laudo: number },
  secoes: {
    aprovacaoDivergencia: PedidoResumido[],   // pedidos status='recebido_pendente_aprovacao'
    macroscopia:          OSResumida[],        // OS etapaAtual='macroscopia', status='em_andamento'
    processamento:        OSResumida[],
    laudo:                OSResumida[],
  }
}
```

Quando `userId != null`, filtra `OSResumida` por `responsavelUserId === userId`.

`OSResumida`: `{ id, numero, etapaAtual, prioridade, responsavelUserId, responsavelNome, amostra: { numeroInterno, numeroCliente, especie, material }, pedido: { numero, cliente: { nome, nomeFantasia } }, iniciadoEm }`.

`PedidoResumido`: `{ id, numero, clienteNome, totalOrcado, totalRecebido, dataRecebimento }`.

#### Novo: `GET /users`

Endpoint simples em `apps/api/src/auth/` (ou novo `users/` module se mais limpo):

```ts
@Get('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('gerencia', 'recepcao', 'tecnico')
listUsers(@Query('roles') rolesCsv?: string) {
  const roles = rolesCsv?.split(',').filter(Boolean);
  return this.usersService.list(roles);
}
```

Retorna `{ id, nome, email, role }[]` para popular Selects de responsável. Filtro opcional por roles (CSV).

### 4.3 DTOs novos

`apps/api/src/pedidos/dto/aprovar-divergencia.dto.ts` — sem body (id vem do path), endpoint sem DTO ou DTO vazio. Manter sem DTO.

`apps/api/src/pedidos/dto/update-servico.dto.ts` — adicionar:
```ts
@IsOptional() @IsBoolean() geraEtiqueta?: boolean;
```

Body de `POST /pedidos/servicos/novo` em `pedidos.controller.ts` — adicionar `geraEtiqueta?: boolean` ao tipo inline.

`apps/api/src/fila/dto/filter-fila.dto.ts`:
```ts
export class FilterFilaDto {
  @IsOptional() @IsBooleanString() soMeus?: string;
}
```

### 4.4 Audit wiring

Injetar `AuditService` em (e chamar `.log()` nos pontos abaixo):

| Service | Método | Action | Entity | Details |
|---|---|---|---|---|
| `RecebimentoService` | `receberPedido` | `RECEBIDO` ou `RECEBIDO_PENDENTE_APROVACAO` | `Pedido` | `{ totalOrcado, totalRecebido, divergente, amostrasIds }` |
| `PedidosService` | `aprovarDivergencia` | `DIVERGENCIA_APROVADA` | `Pedido` | `{ aprovadoPor: userId }` |
| `PedidosService` | `create` | `CREATE` | `Pedido` | `{ clienteId, totalItens }` |
| `PedidosService` | `update` | `UPDATE` | `Pedido` | `{ changes: dto }` |
| `PedidosService` | `updateStatus` | `STATUS_CHANGE` | `Pedido` | `{ de, para }` |
| `PedidosService` | `remove` | `DELETE` | `Pedido` | `{ numero }` |
| `OrdensService` | `create` | `CREATE` | `OrdemServico` | `{ amostraId }` |
| `OrdensService` | `avancar` | `AVANCO_ETAPA` | `OrdemServico` | `{ de, para }` |
| `OrdensService` | `cancelar` | `CANCEL` | `OrdemServico` | `{ amostraId }` |

`AuditService.log` precisa do `userId` — pegar de `req.user.sub ?? req.user.userId ?? req.user.id` no controller e passar pro service. Padrão: services aceitam `userId` como último parâmetro.

`PrismaModule` já provê `AuditService`; basta adicionar `AuditService` aos `providers` dos módulos que ainda não injetam (a verificar — `recebimento.module.ts`, `ordens.module.ts`, `pedidos.module.ts`).

---

## 5. Frontend (`apps/web-admin`)

### 5.1 Nova rota `/fila`

`src/app/(dashboard)/fila/page.tsx`:
- `'use client'`
- Estado: `secoes`, `counts`, `soMeus: boolean`, `loading`
- `useEffect` recarrega ao mudar `soMeus` (debounce simples ou refetch direto)
- Layout: cabeçalho com toggle "Só meus" + total · seções colapsáveis com badge de contagem · linhas clicáveis que navegam pra `/ordens/:id` (ou abrem o drawer existente)

Seções:
1. **Aguardando aprovação de divergência** (amber, só renderiza se `user.role === 'gerencia'`)
2. **Em macroscopia**
3. **Em processamento**
4. **Em laudo**

Cada linha de OS: `Nº amostra · Nº cliente · pedido · cliente · espécie/material · responsável (chip do User) · botão "Avançar"`.

Cada linha de pedido pendente de aprovação: `numero · cliente · orçado N · recebido M · botão "Aprovar"` (chama `PATCH /pedidos/:id/aprovar-divergencia`).

### 5.2 Sidebar

`src/app/(dashboard)/layout.tsx` — adicionar entre `/recebimento` e `/ordens`:
```tsx
{ href: '/fila', label: 'Fila', icon: Inbox },
```

### 5.3 `ReceberDrawer.tsx` (modificar)

Em `src/app/(dashboard)/recebimento/ReceberDrawer.tsx`:
- Calcular `totalOrcado = sum(pedido.itens.quantidade)` (já está disponível via props)
- Linha logo abaixo do botão "+ Adicionar amostra":
  ```tsx
  {amostras.length !== totalOrcado && (
    <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>
        Orçado <strong>{totalOrcado}</strong> · Recebendo <strong>{amostras.length}</strong>.
        Esse pedido entrará em <strong>aprovação da gerência</strong> antes de virar cobrança.
      </span>
    </div>
  )}
  ```
- Submit segue idêntico — backend decide o estado final.

### 5.4 `/pedidos/page.tsx` (modificar)

- Adicionar à `statusConfig`:
  ```ts
  recebido_pendente_aprovacao: { label: 'Aguardando aprovação', variant: 'amber' },
  ```
- Na linha do pedido (drawer ou tabela), se `status === 'recebido_pendente_aprovacao'` e `user.role === 'gerencia'`:
  ```tsx
  <Button size="sm" variant="primary" onClick={() => aprovar(p.id)}>
    Aprovar divergência
  </Button>
  ```
- Função `aprovar(id)`: `api.patch(/pedidos/${id}/aprovar-divergencia, {})` · toast · refetch.

### 5.5 `ServicoFormModal.tsx` (modificar)

Em `src/components/legado/ServicoFormModal.tsx`, adicionar campo após o `Select` de Categoria:
```tsx
<label className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300 mt-1">
  <input
    type="checkbox"
    checked={geraEtiqueta}
    onChange={(e) => setGeraEtiqueta(e.target.checked)}
    className="rounded border-slate-300"
  />
  Gera etiqueta de lâmina/bloco?
</label>
```
Estado novo `[geraEtiqueta, setGeraEtiqueta] = useState(servico?.geraEtiqueta ?? false)`. Incluir no payload do POST/PATCH.

### 5.6 `/ordens/NovaOSDrawer.tsx` + edit (modificar)

Substituir o input texto de `responsavel` por um `<Select>`:
- Carrega usuários via `api.get<UserOpt[]>('/users?roles=gerencia,recepcao,tecnico')` no mount
- `value` = `responsavelUserId` (string para o Select)
- `onChange` grava `responsavelUserId` e o `responsavel: String` (nome) como display

`UserOpt`: `{ id: number, nome: string, email: string, role: string }`.

### 5.7 Helper `useCurrentUser`

`src/hooks/useCurrentUser.ts`:
```ts
'use client'
import { useEffect, useState } from 'react'

export type CurrentUser = { id: number; nome: string; email: string; role: string }

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null)
  useEffect(() => {
    const raw = localStorage.getItem('user')
    if (raw) {
      try { setUser(JSON.parse(raw)) } catch {}
    }
  }, [])
  return user
}
```

Usado em `/pedidos` (mostrar botão Aprovar), `/fila` (filtrar seção de aprovação), `/fila` (toggle "Só meus" usa `user.id` no filtro).

---

## 6. Tipos compartilhados

`src/app/(dashboard)/pedidos/types.ts` — atualizar:
```ts
export type Servico = {
  // ...campos existentes
  geraEtiqueta?: boolean
}
export type Pedido = {
  // ...campos existentes
  contagemDivergente?: boolean
}
```

Tipos novos do `/fila` ficam em `src/app/(dashboard)/fila/types.ts`.

---

## 7. Convenções (seguir à risca)

`'use client'`; ícones `lucide-react`; toasts `sonner`; `@/components/ui/*`, `@/lib/api`; Tailwind slate/blue + `dark:`; BRL via `fmtBRL`; backend NestJS `@Roles` + class-validator + `PrismaService`, `Decimal`→`Number` nas respostas, sub-rotas fixas antes de `:id`.

---

## 8. Fora de escopo (entra em Spec 1B / posterior)

- Template de impressão da OS em papel (PDF/HTML) — baseado no modelo do Cérebro (foto recebida)
- Tela "Pendentes de impressão" para a recepção
- Tela do macroscopista com orçamento lado-a-lado
- Bipagem de conferência final
- Migration histórica do campo `responsavel: String` para `responsavelUserId` em registros existentes (não há dado em prod ainda)

---

## 9. Critérios de sucesso

1. Recepção recebe um pedido com 20 amostras orçadas + 20 recebidas → pedido vai para `recebido`, 20 OS criadas em `macroscopia`, audit log registra `RECEBIDO`.
2. Recepção recebe um pedido com 20 orçadas + 22 recebidas → ReceberDrawer mostra aviso âmbar, pedido vai para `recebido_pendente_aprovacao`, `contagemDivergente=true`, audit log registra `RECEBIDO_PENDENTE_APROVACAO`.
3. Gerência vê o pedido em `/pedidos` com badge âmbar e botão "Aprovar divergência" → clica → pedido transiciona para `recebido`, `contagemDivergente` permanece `true`, audit log registra `DIVERGENCIA_APROVADA`.
4. `/fila` mostra seções por etapa com contagem correta. Toggle "Só meus" filtra OS por `responsavelUserId = current user`.
5. Cadastro de serviço (Pedido Legado) tem checkbox "Gera etiqueta?" que persiste.
6. `NovaOSDrawer` mostra Select de usuários e grava `responsavelUserId`.
7. `AuditLog` table tem entradas reais nas transições principais (verificado por SELECT direto ou audit-viewer futuro).
8. `tsc --noEmit` limpo em api e web-admin. `npm run build` OK. `/pedidos-guiado`, `/pedidos-legado`, `/pedidos` continuam funcionando inalterados.
