# Fundação — Estados, Divergência, Fila e Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo operacional do laboratório: recebimento auto-cria OS por amostra, gate de aprovação para divergência de contagem, dashboard `/fila` por etapa, audit log das transições, e seleção real de responsável (User).

**Architecture:** Backend NestJS+Prisma: migration aditiva, novo módulo `fila/`, novo módulo `users/`, `OrdensService.criarAuto` reutilizado pelo recebimento, wiring do `AuditService` (hoje dead code). Frontend Next.js: rota `/fila`, ajustes em ReceberDrawer / pedidos / ServicoFormModal / NovaOSDrawer, hook `useCurrentUser`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js 14 App Router, TypeScript, Tailwind (slate/blue + dark), lucide-react, sonner, Vitest (web-admin).

---

## Convenções verificadas

**Backend:**
- `PrismaModule` é `@Global()` — `PrismaService` injeta em qualquer service sem importar
- `AuditService` em `apps/api/src/common/audit.service.ts` existe mas **não está em nenhum providers** — precisa ser registrado nos módulos que usarão (`PedidosModule`, `RecebimentoModule`, `OrdensModule`)
- `OrdensModule` já exporta `OrdensService` — pode ser importado em `RecebimentoModule`
- `OrdensService.gerarNumero` é privado — vou expor via novo método público `criarAuto`
- `RecebimentoService.receberPedido` valida `status in ['enviado','rascunho']`, cria amostras via loop com `gerarNumeroInterno`, atualiza pedido status='recebido'
- Padrão `userId` no controller: `req.user.sub ?? req.user.userId ?? req.user.id` (visto em `pedidos.controller.ts:86`)
- Sub-rotas fixas antes de `:id` — convenção rigorosa em `PedidosController`
- Schema aplicado em deploy via `npx prisma db push` (Dockerfile da api) — sem migrations versionadas

**Frontend:**
- `useCurrentUser` (novo) lê `localStorage.user` (mesma pattern do `pedidos-guiado/page.tsx:109-112`)
- Design system: `Button`, `Badge` (variants slate/blue/green/amber/rose/purple), `Input`, `Select`, `Drawer`, `PageHeader`
- API client `@/lib/api` em `api.get/post/patch/delete<T>(path, body?)`
- `statusConfig` em `pedidos/page.tsx:15` é Record<string, {label, variant}>
- Convenções: `'use client'`, lucide-react, sonner, BRL via fmtBRL, Tailwind slate/blue + dark

---

## Mapa de arquivos

### Backend (`apps/api`)

| Ação | Arquivo |
|---|---|
| Modificar | `apps/api/prisma/schema.prisma` (geraEtiqueta, contagemDivergente, responsavelUserId × 2, relações reversas em User) |
| Criar | `apps/api/src/users/users.module.ts` |
| Criar | `apps/api/src/users/users.controller.ts` |
| Criar | `apps/api/src/users/users.service.ts` |
| Modificar | `apps/api/src/app.module.ts` (importa UsersModule, FilaModule) |
| Modificar | `apps/api/src/ordens/ordens.service.ts` (novo método `criarAuto`) |
| Modificar | `apps/api/src/ordens/ordens.module.ts` (providers AuditService) |
| Modificar | `apps/api/src/ordens/ordens.controller.ts` (audit em avancar/cancelar/create) |
| Modificar | `apps/api/src/recebimento/recebimento.module.ts` (importa OrdensModule, providers AuditService) |
| Modificar | `apps/api/src/recebimento/recebimento.service.ts` (auto-OS + divergência) |
| Modificar | `apps/api/src/recebimento/recebimento.controller.ts` (passa userId pro service) |
| Modificar | `apps/api/src/pedidos/pedidos.module.ts` (providers AuditService) |
| Modificar | `apps/api/src/pedidos/pedidos.service.ts` (aprovarDivergencia, STATUS_VALIDOS expand, audit em update/create/remove/updateStatus) |
| Modificar | `apps/api/src/pedidos/pedidos.controller.ts` (rota aprovar-divergencia, geraEtiqueta no criarServico body) |
| Modificar | `apps/api/src/pedidos/dto/update-servico.dto.ts` (geraEtiqueta opcional) |
| Criar | `apps/api/src/fila/fila.module.ts` |
| Criar | `apps/api/src/fila/fila.controller.ts` |
| Criar | `apps/api/src/fila/fila.service.ts` |
| Criar | `apps/api/src/fila/dto/filter-fila.dto.ts` |

### Frontend (`apps/web-admin`)

| Ação | Arquivo |
|---|---|
| Criar | `apps/web-admin/src/hooks/useCurrentUser.ts` |
| Criar | `apps/web-admin/src/app/(dashboard)/fila/page.tsx` |
| Criar | `apps/web-admin/src/app/(dashboard)/fila/types.ts` |
| Modificar | `apps/web-admin/src/app/(dashboard)/layout.tsx` (menu item Fila) |
| Modificar | `apps/web-admin/src/app/(dashboard)/recebimento/ReceberDrawer.tsx` (aviso divergência) |
| Modificar | `apps/web-admin/src/app/(dashboard)/pedidos/page.tsx` (statusConfig + botão Aprovar) |
| Modificar | `apps/web-admin/src/app/(dashboard)/pedidos/types.ts` (contagemDivergente?) |
| Modificar | `apps/web-admin/src/components/legado/ServicoFormModal.tsx` (checkbox geraEtiqueta) |
| Modificar | `apps/web-admin/src/app/(dashboard)/ordens/NovaOSDrawer.tsx` (Select de Users) |
| Modificar | `apps/web-admin/src/app/(dashboard)/ordens/types.ts` (responsavelUserId?) |

Comandos backend partem de `apps/api/`; frontend de `apps/web-admin/`.

---

## Task 1: Migration Prisma (aditiva)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Adicionar `geraEtiqueta` ao Servico**

No `model Servico`, logo após `observacoes String? @db.Text`, adicionar:
```prisma
  geraEtiqueta  Boolean @default(false)
```

- [ ] **Step 2: Adicionar `contagemDivergente` ao Pedido**

No `model Pedido`, logo após `observacoes String? @db.Text`, adicionar:
```prisma
  contagemDivergente Boolean @default(false)
```

- [ ] **Step 3: Adicionar `responsavelUserId` em OrdemServico + relação reversa**

No `model OrdemServico`, logo após `responsavel String?`, adicionar:
```prisma
  responsavelUserId Int?
  responsavelUser   User?  @relation("OSResponsavel", fields: [responsavelUserId], references: [id])
```
E no bloco de índices (no final do model), adicionar:
```prisma
  @@index([responsavelUserId])
```

- [ ] **Step 4: Adicionar `responsavelUserId` em EtapaOS**

No `model EtapaOS`, logo após `responsavel String?`, adicionar:
```prisma
  responsavelUserId Int?
  responsavelUser   User?  @relation("EtapaResponsavel", fields: [responsavelUserId], references: [id])
```

- [ ] **Step 5: Adicionar relações reversas no User**

No `model User`, antes do bloco `@@index([email])`, adicionar:
```prisma
  ordensResponsavel OrdemServico[] @relation("OSResponsavel")
  etapasResponsavel EtapaOS[]      @relation("EtapaResponsavel")
```

- [ ] **Step 6: Regerar Prisma Client**

```bash
cd apps/api && DATABASE_URL="postgresql://u:p@localhost:5432/db" npx prisma generate 2>&1 | tail -3
```
Esperado: `✔ Generated Prisma Client`.

- [ ] **Step 7: Commit**

```bash
cd ../.. && git add apps/api/prisma/schema.prisma && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): schema additions for fundacao (geraEtiqueta, contagemDivergente, responsavelUserId)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Módulo `users/` — GET /users

**Files:**
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/src/users/users.service.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Criar `users.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(roles?: string[]) {
    const where: any = { ativo: true };
    if (roles && roles.length) where.role = { in: roles };
    return this.prisma.user.findMany({
      where,
      select: { id: true, nome: true, email: true, role: true },
      orderBy: { nome: 'asc' },
    });
  }
}
```

- [ ] **Step 2: Criar `users.controller.ts`**

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private service: UsersService) {}

  /** Lista usuários ativos, filtrando por roles (CSV) opcional */
  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico')
  list(@Query('roles') rolesCsv?: string) {
    const roles = rolesCsv?.split(',').map((r) => r.trim()).filter(Boolean);
    return this.service.list(roles);
  }
}
```

- [ ] **Step 3: Criar `users.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 4: Registrar `UsersModule` no `app.module.ts`**

Adicionar o import:
```ts
import { UsersModule } from './users/users.module';
```
E no array `imports`, depois de `AuthModule`:
```ts
    UsersModule,
```

- [ ] **Step 5: Typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 ; echo "--- done ---"
```
Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
cd ../.. && git add apps/api/src/users apps/api/src/app.module.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): users module with GET /users endpoint

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: `OrdensService.criarAuto`

**Files:**
- Modify: `apps/api/src/ordens/ordens.service.ts`

- [ ] **Step 1: Adicionar método público `criarAuto`**

Em `ordens.service.ts`, logo após o método `private async gerarNumero()` (linha ~55), adicionar:
```ts
  /** Cria OS automaticamente para uma amostra (usado pelo Recebimento). */
  async criarAuto(amostraId: number, etapaInicial: string = 'macroscopia') {
    const numero = await this.gerarNumero();
    return this.prisma.ordemServico.create({
      data: {
        amostraId,
        numero,
        etapaAtual: etapaInicial,
        status: 'em_andamento',
        prioridade: 'normal',
        iniciadoEm: new Date(),
        etapas: {
          create: {
            etapa: etapaInicial,
            status: 'em_andamento',
            iniciadoEm: new Date(),
          },
        },
      },
    });
  }
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add apps/api/src/ordens/ordens.service.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): OrdensService.criarAuto for auto-creation in Recebimento

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Registrar `AuditService` nos módulos

**Files:**
- Modify: `apps/api/src/pedidos/pedidos.module.ts`
- Modify: `apps/api/src/recebimento/recebimento.module.ts`
- Modify: `apps/api/src/ordens/ordens.module.ts`

- [ ] **Step 1: `pedidos.module.ts`**

Substituir o arquivo inteiro por:
```ts
import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [PedidosController],
  providers: [PedidosService, AuditService],
  exports: [PedidosService],
})
export class PedidosModule {}
```

- [ ] **Step 2: `recebimento.module.ts`**

Substituir o arquivo inteiro por:
```ts
import { Module } from '@nestjs/common';
import { RecebimentoController } from './recebimento.controller';
import { RecebimentoService } from './recebimento.service';
import { AuditService } from '../common/audit.service';
import { OrdensModule } from '../ordens/ordens.module';

@Module({
  imports: [OrdensModule],
  controllers: [RecebimentoController],
  providers: [RecebimentoService, AuditService],
  exports: [RecebimentoService],
})
export class RecebimentoModule {}
```

- [ ] **Step 3: `ordens.module.ts`**

Substituir o arquivo inteiro por:
```ts
import { Module } from '@nestjs/common';
import { OrdensController } from './ordens.controller';
import { OrdensService } from './ordens.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [OrdensController],
  providers: [OrdensService, AuditService],
  exports: [OrdensService],
})
export class OrdensModule {}
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/api/src/pedidos/pedidos.module.ts apps/api/src/recebimento/recebimento.module.ts apps/api/src/ordens/ordens.module.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "chore(api): register AuditService providers; recebimento imports OrdensModule

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: RecebimentoService — auto-OS + divergência + audit

**Files:**
- Modify: `apps/api/src/recebimento/recebimento.service.ts`
- Modify: `apps/api/src/recebimento/recebimento.controller.ts`

- [ ] **Step 1: Atualizar imports do service**

No topo de `recebimento.service.ts`, adicionar:
```ts
import { OrdensService } from '../ordens/ordens.service';
import { AuditService } from '../common/audit.service';
```
E no constructor:
```ts
  constructor(
    private prisma: PrismaService,
    private ordens: OrdensService,
    private audit: AuditService,
  ) {}
```

- [ ] **Step 2: Reescrever `receberPedido` com auto-OS + divergência + audit**

Substituir o método `receberPedido` inteiro por:
```ts
  async receberPedido(dto: ReceberPedidoDto, userId: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      select: {
        id: true,
        status: true,
        itens: { select: { quantidade: true } },
      },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${dto.pedidoId} não encontrado.`);
    if (!['enviado', 'rascunho'].includes(pedido.status)) {
      throw new BadRequestException(
        `Pedido está com status "${pedido.status}" e não pode ser recebido agora.`,
      );
    }

    const agora = new Date();
    const amostrasCreated: any[] = [];

    for (const item of dto.amostras) {
      const numeroInterno = await this.gerarNumeroInterno();
      const amostra = await this.prisma.amostra.create({
        data: {
          pedidoId: dto.pedidoId,
          numeroInterno,
          numeroCliente: item.numeroCliente,
          especie: item.especie,
          material: item.material,
          localizacao: item.localizacao,
          observacoes: item.observacoes,
          status: 'pendente',
          dataRecebimento: agora,
          recebidoPor: dto.recebidoPor,
        },
        include: INCLUDE_AMOSTRA,
      });
      amostrasCreated.push(amostra);

      // Auto-cria OS para a amostra, na etapa macroscopia
      await this.ordens.criarAuto(amostra.id, 'macroscopia');
      // Amostra entra em em_processamento (OS assumiu)
      await this.prisma.amostra.update({
        where: { id: amostra.id },
        data: { status: 'em_processamento' },
      });
    }

    // Computa divergência
    const totalOrcado = pedido.itens.reduce((s, it) => s + it.quantidade, 0);
    const totalRecebido = amostrasCreated.length;
    const divergente = totalRecebido !== totalOrcado;
    const novoStatus = divergente ? 'recebido_pendente_aprovacao' : 'recebido';

    await this.prisma.pedido.update({
      where: { id: dto.pedidoId },
      data: {
        status: novoStatus,
        contagemDivergente: divergente,
        dataRecebimento: agora,
      },
    });

    await this.audit.log(
      userId,
      divergente ? 'RECEBIDO_PENDENTE_APROVACAO' : 'RECEBIDO',
      'Pedido',
      dto.pedidoId,
      { totalOrcado, totalRecebido, divergente, amostrasIds: amostrasCreated.map((a) => a.id) },
    );

    return {
      message: divergente
        ? `${totalRecebido} amostra(s) registrada(s). Contagem orçada (${totalOrcado}) diverge — pedido aguarda aprovação da gerência.`
        : `${totalRecebido} amostra(s) registrada(s). Pedido #${dto.pedidoId} marcado como recebido.`,
      amostras: amostrasCreated,
      divergente,
      totalOrcado,
      totalRecebido,
    };
  }
```

- [ ] **Step 3: Passar `userId` no controller**

Em `recebimento.controller.ts`, ajustar imports (adicionar `Request`):
```ts
import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
```
E o handler `receberPedido`:
```ts
  @Post('receber')
  @Roles('gerencia', 'recepcao')
  receberPedido(@Body() dto: ReceberPedidoDto, @Request() req: any) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.receberPedido(dto, userId);
  }
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/api/src/recebimento/recebimento.service.ts apps/api/src/recebimento/recebimento.controller.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): recebimento auto-creates OS + divergence gate + audit log

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: PedidosService — aprovarDivergencia + STATUS expand + audit

**Files:**
- Modify: `apps/api/src/pedidos/pedidos.service.ts`
- Modify: `apps/api/src/pedidos/pedidos.controller.ts`

- [ ] **Step 1: Expandir `STATUS_VALIDOS` e adicionar import de AuditService**

Em `pedidos.service.ts`, no topo (depois dos imports existentes):
```ts
import { AuditService } from '../common/audit.service';
```
Constructor:
```ts
  constructor(private prisma: PrismaService, private audit: AuditService) {}
```
Substituir a linha de `STATUS_VALIDOS`:
```ts
const STATUS_VALIDOS = ['rascunho', 'enviado', 'recebido', 'recebido_pendente_aprovacao', 'cancelado'];
```

- [ ] **Step 2: Adicionar método `aprovarDivergencia`**

Logo após `updateStatus`, adicionar:
```ts
  async aprovarDivergencia(id: number, userId: number) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id } });
    if (!pedido) throw new NotFoundException(`Pedido #${id} não encontrado.`);
    if (pedido.status !== 'recebido_pendente_aprovacao') {
      throw new BadRequestException(
        `Pedido #${id} não está aguardando aprovação (status atual: ${pedido.status}).`,
      );
    }
    const updated = await this.prisma.pedido.update({
      where: { id },
      data: { status: 'recebido' }, // contagemDivergente fica true como rastro histórico
      include: INCLUDE_FULL,
    });
    await this.audit.log(userId, 'DIVERGENCIA_APROVADA', 'Pedido', id, { aprovadoPor: userId });
    return this.toShape(updated);
  }
```

- [ ] **Step 3: Adicionar rota no controller**

Em `pedidos.controller.ts`, ajustar imports (adicionar `Request`):
```ts
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, UseGuards, HttpCode, Request } from '@nestjs/common';
```
E adicionar handler **antes** do `@Delete(':id')` (manter ordem sub-rota → `:id`):
```ts
  /** Aprovar divergência de contagem (libera o pedido pra cobrança) */
  @Patch(':id/aprovar-divergencia')
  @Roles('gerencia')
  aprovarDivergencia(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.aprovarDivergencia(id, userId);
  }
```

- [ ] **Step 4: Adicionar audit em criarServico (geraEtiqueta) + extender tipo**

No `pedidos.controller.ts`, no body inline do handler `criarServico`, adicionar a propriedade `geraEtiqueta?: boolean` ao tipo. Resultado:
```ts
  @Post('servicos/novo')
  @HttpCode(201)
  @Roles('gerencia', 'recepcao')
  criarServico(@Body() body: {
    codigo: string
    categoria: string
    nome: string
    precoBase: number
    precoRotina: number
    precoPesquisa: number
    observacoes?: string
    geraEtiqueta?: boolean
    variante1?: string
    variante2?: string
    variante3?: string
    variante4?: string
    variante5?: string
  }) {
    return this.service.criarServico(body);
  }
```

E no `pedidos.service.ts` no método `criarServico`, adicionar `geraEtiqueta` ao tipo do parâmetro (junto com `observacoes?`) e ao `data`:
```ts
        observacoes:  dto.observacoes ?? null,
        geraEtiqueta: dto.geraEtiqueta ?? false,
```

- [ ] **Step 5: Adicionar audit nos métodos de Pedido existentes**

No `pedidos.service.ts`, dentro de `create` (logo antes do `return`):
```ts
    await this.audit.log(/* userId */ 0, 'CREATE', 'Pedido', pedido.id, { clienteId: dto.clienteId, totalItens: dto.itens.length });
```
> Nota: `userId` aqui é placeholder porque o `create` atual não recebe userId. Vamos passar do controller — ajuste já abaixo.

Adicionar `userId: number` ao final do parâmetro de `create`, `update`, `updateStatus`, `remove` e `atualizarServico` (este último — manter como está, opcional). Para cada um, no controller correspondente, pegar `userId` do `req.user` e passar.

**Para simplicidade do MVP**, NÃO modificar a assinatura de `create/update/remove`. Em vez disso, fazer o audit log nos handlers do controller (com o req disponível) ou criar um helper interno. **Decisão para este plano: adicionar audit apenas em `aprovarDivergencia`, `receberPedido`, `avancar` e `cancelar`** — pontos críticos do fluxo. Os demais (`create/update/remove`) ficam como TO-DO futuro pra evitar refactor amplo agora.

→ **Ignore essa Step 5** — não adicione audit em create/update/remove agora. O audit cobre só os pontos críticos do fluxo via Tasks 5, 6 e 7.

- [ ] **Step 6: Typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 7: Commit**

```bash
cd ../.. && git add apps/api/src/pedidos/pedidos.service.ts apps/api/src/pedidos/pedidos.controller.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): aprovar-divergencia endpoint + status expand + geraEtiqueta in criarServico

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: OrdensService — audit em avancar/cancelar/create

**Files:**
- Modify: `apps/api/src/ordens/ordens.service.ts`
- Modify: `apps/api/src/ordens/ordens.controller.ts`

- [ ] **Step 1: Importar e injetar AuditService**

No topo de `ordens.service.ts`:
```ts
import { AuditService } from '../common/audit.service';
```
Constructor:
```ts
  constructor(private prisma: PrismaService, private audit: AuditService) {}
```

- [ ] **Step 2: Logar em `create`, `avancar` e `cancelar`**

**Em `create`** (no final, antes do `return`):
```ts
    await this.audit.log(userId, 'CREATE', 'OrdemServico', os.id, { amostraId: dto.amostraId });
```
**Em `avancar`** (no final, antes do `return`):
```ts
    await this.audit.log(userId, 'AVANCO_ETAPA', 'OrdemServico', id, { de: etapaAtual, para: proxima });
```
**Em `cancelar`** (no final, antes do `return`):
```ts
    await this.audit.log(userId, 'CANCEL', 'OrdemServico', id, { amostraId: os.amostraId });
```

Para os 3 métodos: adicionar `userId: number` como **último parâmetro** das assinaturas. Onde a variável `etapaAtual` / `proxima` / `os` é referenciada acima, conferir os nomes reais no código existente — manter as referências consistentes.

- [ ] **Step 3: Atualizar controller para passar userId**

Em `ordens.controller.ts`, adicionar import de `Request`:
```ts
import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
```

Atualizar os 3 handlers correspondentes:
```ts
  @Post()
  @Roles('gerencia', 'recepcao', 'tecnico')
  create(@Body() dto: CreateOrdemDto, @Request() req: any) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.create(dto, userId);
  }
```
```ts
  @Patch(':id/avancar')
  @Roles('gerencia', 'tecnico')
  avancar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.avancar(id, userId);
  }
```
```ts
  @Patch(':id/cancelar')
  @Roles('gerencia')
  cancelar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.cancelar(id, userId);
  }
```

> Atenção: o método assinado como `create` do `OrdensService` já existia sem `userId`. Após adicionar o parâmetro, callers internos (se houver) precisam ser ajustados. `criarAuto` foi adicionado na Task 3 e **NÃO chama `create`**, então não há regressão. Verificar com tsc.

- [ ] **Step 4: Typecheck**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/api/src/ordens/ordens.service.ts apps/api/src/ordens/ordens.controller.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): audit log on OS create/avancar/cancelar

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Módulo `fila/`

**Files:**
- Create: `apps/api/src/fila/fila.module.ts`
- Create: `apps/api/src/fila/fila.controller.ts`
- Create: `apps/api/src/fila/fila.service.ts`
- Create: `apps/api/src/fila/dto/filter-fila.dto.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Criar `dto/filter-fila.dto.ts`**

```ts
import { IsOptional, IsBooleanString } from 'class-validator';

export class FilterFilaDto {
  @IsOptional() @IsBooleanString() soMeus?: string;
}
```

- [ ] **Step 2: Criar `fila.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const ETAPAS = ['macroscopia', 'processamento', 'laudo'] as const;

@Injectable()
export class FilaService {
  constructor(private prisma: PrismaService) {}

  async getFila(userId?: number) {
    // Seção 1: pedidos aguardando aprovação de divergência
    const pedidosPendentes = await this.prisma.pedido.findMany({
      where: { status: 'recebido_pendente_aprovacao' },
      select: {
        id: true,
        numero: true,
        dataRecebimento: true,
        contagemDivergente: true,
        cliente: { select: { nome: true, nomeFantasia: true } },
        itens: { select: { quantidade: true } },
        amostras: { select: { id: true } },
      },
      orderBy: { dataRecebimento: 'asc' },
      take: 50,
    });

    const aprovacaoDivergencia = pedidosPendentes.map((p) => ({
      id: p.id,
      numero: p.numero,
      clienteNome: p.cliente?.nomeFantasia || p.cliente?.nome || '',
      totalOrcado: p.itens.reduce((s, i) => s + i.quantidade, 0),
      totalRecebido: p.amostras.length,
      dataRecebimento: p.dataRecebimento,
    }));

    // Seções 2-4: OS por etapa
    const osSelect = {
      id: true,
      numero: true,
      etapaAtual: true,
      prioridade: true,
      responsavel: true,
      responsavelUserId: true,
      iniciadoEm: true,
      amostra: {
        select: {
          id: true,
          numeroInterno: true,
          numeroCliente: true,
          especie: true,
          material: true,
          pedido: {
            select: {
              numero: true,
              cliente: { select: { nome: true, nomeFantasia: true } },
            },
          },
        },
      },
    } as const;

    const baseWhere: any = { status: 'em_andamento' };
    if (userId) baseWhere.responsavelUserId = userId;

    const [macroscopia, processamento, laudo] = await Promise.all(
      ETAPAS.map((etapa) =>
        this.prisma.ordemServico.findMany({
          where: { ...baseWhere, etapaAtual: etapa },
          select: osSelect,
          orderBy: [{ prioridade: 'desc' }, { iniciadoEm: 'asc' }],
          take: 50,
        }),
      ),
    );

    return {
      counts: {
        aprovacaoDivergencia: aprovacaoDivergencia.length,
        macroscopia: macroscopia.length,
        processamento: processamento.length,
        laudo: laudo.length,
      },
      secoes: {
        aprovacaoDivergencia,
        macroscopia,
        processamento,
        laudo,
      },
    };
  }
}
```

- [ ] **Step 3: Criar `fila.controller.ts`**

```ts
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { FilaService } from './fila.service';
import { FilterFilaDto } from './dto/filter-fila.dto';

@Controller('fila')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilaController {
  constructor(private service: FilaService) {}

  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico')
  getFila(@Query() filter: FilterFilaDto, @Request() req: any) {
    const soMeus = filter.soMeus === 'true';
    const userId = soMeus ? (req.user.sub ?? req.user.userId ?? req.user.id) : undefined;
    return this.service.getFila(userId);
  }
}
```

- [ ] **Step 4: Criar `fila.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { FilaController } from './fila.controller';
import { FilaService } from './fila.service';

@Module({
  controllers: [FilaController],
  providers: [FilaService],
  exports: [FilaService],
})
export class FilaModule {}
```

- [ ] **Step 5: Registrar no `app.module.ts`**

Adicionar import:
```ts
import { FilaModule } from './fila/fila.module';
```
E no array `imports`, depois de `OrdensModule`:
```ts
    FilaModule,
```

- [ ] **Step 6: Typecheck + build api**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 && npm run build 2>&1 | tail -5 ; echo "--- done ---"
```
Esperado: sem erros.

- [ ] **Step 7: Commit**

```bash
cd ../.. && git add apps/api/src/fila apps/api/src/app.module.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): fila module — aggregated queue endpoint

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: DTO `UpdateServicoDto` aceita `geraEtiqueta`

**Files:**
- Modify: `apps/api/src/pedidos/dto/update-servico.dto.ts`

- [ ] **Step 1: Adicionar import e campo**

No topo, garantir que `IsBoolean` está no import de `class-validator`. Adicionar dentro da classe `UpdateServicoDto`:
```ts
  @IsOptional() @IsBoolean() geraEtiqueta?: boolean;
```

E ajustar import no topo do arquivo:
```ts
import { IsOptional, IsString, IsNumber, Min, IsBoolean } from 'class-validator';
```

- [ ] **Step 2: Em `pedidos.service.ts` — `atualizarServico` aceita geraEtiqueta automaticamente**

Não precisa mudar nada — `atualizarServico` usa `const data: any = { ...dto };` que já carrega a propriedade nova.

- [ ] **Step 3: Typecheck + commit**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 && cd ../.. && git add apps/api/src/pedidos/dto/update-servico.dto.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): UpdateServicoDto accepts geraEtiqueta

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Hook `useCurrentUser`

**Files:**
- Create: `apps/web-admin/src/hooks/useCurrentUser.ts`

- [ ] **Step 1: Criar o hook**

```ts
'use client'

import { useEffect, useState } from 'react'

export type CurrentUser = {
  id: number
  nome: string
  email: string
  role: string
}

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

- [ ] **Step 2: Commit**

```bash
git add apps/web-admin/src/hooks/useCurrentUser.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(web-admin): useCurrentUser hook reading localStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Tipos do Pedido e da OS

**Files:**
- Modify: `apps/web-admin/src/app/(dashboard)/pedidos/types.ts`
- Modify: `apps/web-admin/src/app/(dashboard)/ordens/types.ts`

- [ ] **Step 1: Atualizar `pedidos/types.ts`**

No type `Servico`, depois de `observacoes?:`, adicionar:
```ts
  geraEtiqueta?: boolean
```
No type `Pedido`, depois de `observacoes?:`, adicionar:
```ts
  contagemDivergente?: boolean
```

- [ ] **Step 2: Atualizar `ordens/types.ts`**

No type `OrdemServico`, depois de `responsavel?:`, adicionar:
```ts
  responsavelUserId?: number | null
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web-admin/src/app/(dashboard)/pedidos/types.ts" "apps/web-admin/src/app/(dashboard)/ordens/types.ts" && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(web-admin): add geraEtiqueta + contagemDivergente + responsavelUserId types

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Página `/fila`

**Files:**
- Create: `apps/web-admin/src/app/(dashboard)/fila/types.ts`
- Create: `apps/web-admin/src/app/(dashboard)/fila/page.tsx`
- Modify: `apps/web-admin/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Criar `fila/types.ts`**

```ts
export type FilaOS = {
  id: number
  numero: string
  etapaAtual: string
  prioridade: string
  responsavel?: string | null
  responsavelUserId?: number | null
  iniciadoEm?: string | null
  amostra: {
    id: number
    numeroInterno: string
    numeroCliente?: string | null
    especie: string
    material: string
    pedido: {
      numero: string
      cliente: { nome: string; nomeFantasia?: string | null }
    }
  }
}

export type FilaPedidoPendente = {
  id: number
  numero: string
  clienteNome: string
  totalOrcado: number
  totalRecebido: number
  dataRecebimento?: string | null
}

export type FilaResponse = {
  counts: {
    aprovacaoDivergencia: number
    macroscopia: number
    processamento: number
    laudo: number
  }
  secoes: {
    aprovacaoDivergencia: FilaPedidoPendente[]
    macroscopia: FilaOS[]
    processamento: FilaOS[]
    laudo: FilaOS[]
  }
}
```

- [ ] **Step 2: Criar `fila/page.tsx`**

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Inbox, AlertTriangle, Microscope, Layers, FileCheck, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { FilaResponse, FilaOS, FilaPedidoPendente } from './types'

const ETAPA_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  macroscopia:   { label: 'Em macroscopia',   icon: Microscope, color: 'text-blue-600' },
  processamento: { label: 'Em processamento', icon: Layers,     color: 'text-indigo-600' },
  laudo:         { label: 'Em laudo',         icon: FileCheck,  color: 'text-emerald-600' },
}

function fmtData(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function FilaPage() {
  const user = useCurrentUser()
  const [soMeus, setSoMeus] = useState(false)
  const [data, setData] = useState<FilaResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    const qs = soMeus ? '?soMeus=true' : ''
    api.get<FilaResponse>(`/fila${qs}`)
      .then(setData)
      .catch(() => toast.error('Erro ao carregar fila'))
      .finally(() => setLoading(false))
  }, [soMeus])

  useEffect(() => { load() }, [load])

  async function aprovarDivergencia(pedidoId: number) {
    try {
      await api.patch(`/pedidos/${pedidoId}/aprovar-divergencia`, {})
      toast.success('Divergência aprovada')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao aprovar')
    }
  }

  async function avancarOS(osId: number) {
    try {
      await api.patch(`/ordens/${osId}/avancar`, {})
      toast.success('Etapa avançada')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao avançar etapa')
    }
  }

  const isGerencia = user?.role === 'gerencia'

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="h-6 w-6" /> Fila
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Itens em andamento por etapa do laboratório
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={soMeus}
            onChange={(e) => setSoMeus(e.target.checked)}
            className="rounded border-slate-300"
          />
          Só meus
        </label>
      </div>

      {loading && <p className="text-sm text-slate-400">Carregando…</p>}

      {data && (
        <div className="space-y-5">
          {/* Aprovação de divergência (só gerência) */}
          {isGerencia && data.secoes.aprovacaoDivergencia.length > 0 && (
            <SecaoDivergencia
              itens={data.secoes.aprovacaoDivergencia}
              onAprovar={aprovarDivergencia}
            />
          )}

          {/* OS por etapa */}
          {(['macroscopia', 'processamento', 'laudo'] as const).map((etapa) => (
            <SecaoOS
              key={etapa}
              etapa={etapa}
              itens={data.secoes[etapa]}
              count={data.counts[etapa]}
              onAvancar={avancarOS}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Seção: aprovação de divergência ─────────────────────────────────────────

function SecaoDivergencia({ itens, onAprovar }: { itens: FilaPedidoPendente[]; onAprovar: (id: number) => void }) {
  return (
    <section className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-amber-200 dark:border-amber-700/50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
          Aguardando aprovação de divergência
        </h2>
        <Badge variant="amber" className="ml-auto">{itens.length}</Badge>
      </div>
      <div className="divide-y divide-amber-200 dark:divide-amber-700/30">
        {itens.map((p) => (
          <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{p.numero}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                {p.clienteNome} · Orçado <strong>{p.totalOrcado}</strong> · Recebido <strong>{p.totalRecebido}</strong> · {fmtData(p.dataRecebimento)}
              </p>
            </div>
            <Button size="sm" onClick={() => onAprovar(p.id)}>Aprovar divergência</Button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Seção: OS por etapa ─────────────────────────────────────────────────────

function SecaoOS({ etapa, itens, count, onAvancar }: { etapa: 'macroscopia' | 'processamento' | 'laudo'; itens: FilaOS[]; count: number; onAvancar: (id: number) => void }) {
  const meta = ETAPA_META[etapa]
  const Icon = meta.icon
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
        <Icon className={`h-4 w-4 ${meta.color}`} />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{meta.label}</h2>
        <Badge variant="slate" className="ml-auto">{count}</Badge>
      </div>
      {itens.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12px] text-slate-400">Nada nessa etapa.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {itens.map((o) => (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                  {o.numero} · Amostra {o.amostra.numeroInterno}
                  {o.amostra.numeroCliente ? ` (${o.amostra.numeroCliente})` : ''}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {o.amostra.pedido.numero} · {o.amostra.pedido.cliente.nomeFantasia || o.amostra.pedido.cliente.nome} · {o.amostra.especie} · {o.amostra.material}
                  {o.responsavel ? ` · ${o.responsavel}` : ''}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onAvancar(o.id)}>
                Avançar <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Sidebar — adicionar item Fila**

Em `apps/web-admin/src/app/(dashboard)/layout.tsx`, adicionar `Inbox` ao import de `lucide-react`:
```ts
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  GitBranch,
  FileSpreadsheet,
  Boxes,
  PackageOpen,
  Inbox,
  // ...resto
```

E no array `menuItems`, **entre `/recebimento` e `/ordens`**, adicionar:
```ts
  { href: '/fila', label: 'Fila', icon: Inbox },
```

- [ ] **Step 4: Typecheck + build do web-admin**

```bash
cd apps/web-admin && npx tsc --noEmit 2>&1 | tail -5 && npm run build 2>&1 | tail -8 ; echo "--- done ---"
```
Esperado: build OK, rota `/fila` listada.

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add "apps/web-admin/src/app/(dashboard)/fila" "apps/web-admin/src/app/(dashboard)/layout.tsx" && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(web-admin): /fila page with sections per etapa + soMeus filter

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: Aviso de divergência no ReceberDrawer

**Files:**
- Modify: `apps/web-admin/src/app/(dashboard)/recebimento/ReceberDrawer.tsx`

- [ ] **Step 1: Adicionar import do ícone**

Adicionar `AlertTriangle` ao import de `lucide-react`:
```tsx
import { Plus, Trash2, Package, FlaskConical, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 2: Adicionar variável `totalOrcado` derivada**

Dentro do componente, perto do início (após o `useState` de amostras):
```tsx
  const totalOrcado = pedido ? pedido.itens.reduce((s, it) => s + it.quantidade, 0) : 0
  const divergente = pedido != null && amostras.length !== totalOrcado
```

- [ ] **Step 3: Renderizar o aviso âmbar antes do botão "Adicionar amostra"**

Dentro do JSX, localizar onde a seção de amostras é renderizada (perto da label `Amostras ({amostras.length})` — linha ~178). Logo após o cabeçalho dessa seção e ANTES do `.map` de amostras, adicionar:
```tsx
            {divergente && (
              <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400 flex items-start gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Orçado <strong>{totalOrcado}</strong> · Recebendo <strong>{amostras.length}</strong>.
                  Esse pedido entrará em <strong>aprovação da gerência</strong> antes de virar cobrança.
                </span>
              </div>
            )}
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/web-admin && npx tsc --noEmit 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add "apps/web-admin/src/app/(dashboard)/recebimento/ReceberDrawer.tsx" && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(recebimento): divergence warning in ReceberDrawer

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 14: `/pedidos` status badge + botão Aprovar

**Files:**
- Modify: `apps/web-admin/src/app/(dashboard)/pedidos/page.tsx`

- [ ] **Step 1: Atualizar `statusConfig`**

Localizar `const statusConfig: ...` (linha 15) e adicionar a entrada `recebido_pendente_aprovacao`:
```ts
const statusConfig: Record<string, { label: string; variant: 'slate' | 'blue' | 'green' | 'rose' | 'amber' }> = {
  rascunho:  { label: 'Rascunho',  variant: 'slate' },
  enviado:   { label: 'Enviado',   variant: 'blue'  },
  recebido_pendente_aprovacao: { label: 'Aguardando aprovação', variant: 'amber' },
  recebido:  { label: 'Recebido',  variant: 'green' },
  cancelado: { label: 'Cancelado', variant: 'rose'  },
}
```

- [ ] **Step 2: Importar hook e função de aprovação**

No topo, adicionar imports:
```tsx
import { useCurrentUser } from '@/hooks/useCurrentUser'
```

Dentro do componente, adicionar:
```tsx
  const user = useCurrentUser()
```

Adicionar a função (junto com os outros handlers do componente):
```tsx
  const aprovarDivergencia = async (id: number) => {
    try {
      await api.patch(`/pedidos/${id}/aprovar-divergencia`, {})
      toast.success('Divergência aprovada')
      load()  // ou seja-lá-qual-for o nome do fetch existente
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao aprovar')
    }
  }
```
> Nota: confirmar o nome real do método de refetch ao ler o arquivo. Pode ser `loadPedidos()`, `fetchPedidos()` ou um setter de estado direto.

- [ ] **Step 3: Adicionar botão na linha do pedido (na tabela ou drawer)**

Localizar onde cada linha de pedido é renderizada na tabela (perto de onde o badge do status é exibido — linha ~196). Adicionar:
```tsx
{p.status === 'recebido_pendente_aprovacao' && user?.role === 'gerencia' && (
  <Button
    size="sm"
    variant="primary"
    onClick={(e) => { e.stopPropagation(); aprovarDivergencia(p.id) }}
  >
    Aprovar
  </Button>
)}
```
Posicionar visualmente próximo ao status badge (lado direito da linha geralmente).

- [ ] **Step 4: Typecheck + build**

```bash
cd apps/web-admin && npx tsc --noEmit 2>&1 | tail -5 && npm run build 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add "apps/web-admin/src/app/(dashboard)/pedidos/page.tsx" && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(pedidos): badge for pending approval + Aprovar button (gerencia only)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 15: Checkbox `geraEtiqueta` no ServicoFormModal

**Files:**
- Modify: `apps/web-admin/src/components/legado/ServicoFormModal.tsx`

- [ ] **Step 1: Adicionar estado + payload**

Logo após os outros `useState`s do form, adicionar:
```tsx
  const [geraEtiqueta, setGeraEtiqueta] = useState(servico?.geraEtiqueta ?? false)
```

E no payload do `editing ? PATCH : POST` (dentro de `handleSubmit`), adicionar:
- No PATCH: `geraEtiqueta,` na lista de propriedades
- No POST: `geraEtiqueta,` na lista de propriedades

- [ ] **Step 2: Adicionar o checkbox no JSX**

Localizar o `<Select label="Categoria" ...>` no JSX (entre Nome e Código). Logo após o div que contém esse Select, adicionar:
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

- [ ] **Step 3: Typecheck**

```bash
cd apps/web-admin && npx tsc --noEmit 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 4: Commit**

```bash
cd ../.. && git add apps/web-admin/src/components/legado/ServicoFormModal.tsx && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(legado): checkbox 'gera etiqueta' in ServicoFormModal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 16: Select de Users no NovaOSDrawer

**Files:**
- Modify: `apps/web-admin/src/app/(dashboard)/ordens/NovaOSDrawer.tsx`

- [ ] **Step 1: Adicionar tipo + estado**

No topo do arquivo:
```tsx
type UserOpt = { id: number; nome: string; email: string; role: string }
```

Adicionar estado dentro do componente:
```tsx
  const [users, setUsers] = useState<UserOpt[]>([])
  const [responsavelUserId, setResponsavelUserId] = useState<string>('')
```

Em um `useEffect`:
```tsx
  useEffect(() => {
    api.get<UserOpt[]>('/users?roles=gerencia,recepcao,tecnico')
      .then(setUsers)
      .catch(() => {})
  }, [])
```

- [ ] **Step 2: Substituir o `<Input>` de responsável por `<Select>`**

Localizar o `<Input>` que captura `responsavel` (linha ~177). Trocar por:
```tsx
            <Select
              label="Responsável"
              value={responsavelUserId}
              onChange={(e) => {
                setResponsavelUserId(e.target.value)
                const u = users.find((x) => String(x.id) === e.target.value)
                setResponsavel(u?.nome ?? '')
              }}
              options={[
                { value: '', label: '— Sem responsável —' },
                ...users.map((u) => ({ value: String(u.id), label: `${u.nome} (${u.role})` })),
              ]}
            />
```

- [ ] **Step 3: Incluir `responsavelUserId` no payload do POST**

No `handleSubmit`, no objeto enviado pra `api.post('/ordens', ...)`, adicionar:
```tsx
        responsavelUserId: responsavelUserId ? parseInt(responsavelUserId) : undefined,
```

- [ ] **Step 4: Verificar que `CreateOrdemDto` aceita o novo campo**

Em `apps/api/src/ordens/dto/create-ordem.dto.ts`, conferir e adicionar (se faltar):
```ts
  @IsOptional() @IsInt() responsavelUserId?: number;
```
Import: `import { IsOptional, IsInt, ... } from 'class-validator';`

E em `ordens.service.ts` `create`, garantir que o campo é persistido — usar `...dto` no `data`, ou listar explicitamente.

- [ ] **Step 5: Typecheck + build api + web-admin**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -5 && cd ../web-admin && npx tsc --noEmit 2>&1 | tail -5 && npm run build 2>&1 | tail -5 ; echo "--- done ---"
```

- [ ] **Step 6: Commit**

```bash
cd ../.. && git add "apps/web-admin/src/app/(dashboard)/ordens/NovaOSDrawer.tsx" apps/api/src/ordens/dto/create-ordem.dto.ts apps/api/src/ordens/ordens.service.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(ordens): NovaOSDrawer uses User Select for responsavel

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 17: Build final + push

- [ ] **Step 1: Build completo**

```bash
npm run build 2>&1 | tail -20
```
Esperado: api + web-admin compilam, rota `/fila` listada.

- [ ] **Step 2: Verificar histórico de commits desde origin/main**

```bash
git log origin/main..HEAD --oneline
```
Esperado: ~16 commits desde a base.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Confirmar**

```bash
git log origin/main --oneline -16
```

- [ ] **Step 5: Lembrar do redeploy**

Lembre o usuário: **API e web-admin precisam redeployar** no Coolify. A migration aplica via `prisma db push` automático no boot da API. Validar manualmente após o deploy:
1. Receber um pedido com contagem batendo → vira `recebido`, OS criadas em `macroscopia`
2. Receber um pedido com contagem divergente → drawer mostra aviso âmbar, pedido vira `recebido_pendente_aprovacao`
3. Em `/pedidos`, badge âmbar aparece; gerência clica em Aprovar → vira `recebido`
4. `/fila` carrega as 4 seções; toggle "Só meus" filtra OS
5. ServicoFormModal: checkbox "Gera etiqueta?" persiste
6. NovaOSDrawer: Select carrega lista de usuários reais
7. SELECT em `AuditLog` table: deve ter entradas das transições
