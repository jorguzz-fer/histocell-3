# Pedido Legado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o modo "Pedido Legado" — lançar pedido navegando o catálogo no formato da planilha legada, com CRUD de serviço (editar/arquivar/deletar/criar) auxiliar.

**Architecture:** Backend NestJS+Prisma ganha campo `observacoes` e endpoints de edição/arquivamento/exclusão de serviço sob `/pedidos`. Frontend extrai `useOrderCart` (lógica de carrinho hoje inline no Pedido Guiado) e adiciona a página `/pedidos-legado` com tabela formato-legado + modal de serviço, reusando o pipeline de pedido.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js 14 App Router, TypeScript, Tailwind (slate/blue + dark), lucide-react, sonner.

---

## Convenções verificadas

**Backend** (`apps/api/src/pedidos`):
- `pedidos.controller.ts`: `@Controller('pedidos')`, guards `JwtAuthGuard + RolesGuard`, sub-rotas fixas declaradas ANTES de `:id`. Imports já incluem `Patch, Delete, Param, Body, Query, ParseIntPipe`.
- `pedidos.service.ts`: imports `Injectable, NotFoundException, BadRequestException` de `@nestjs/common`; `PrismaService` de `../common/prisma.service`. Padrão `Decimal → Number` nas respostas. `criarServico` já existe e aceita `tipo/variante1..5`.
- Prisma accessors: `prisma.servico`, `prisma.itemPedido`, `prisma.itemOrcamento`, `prisma.servicoFavorito`, `prisma.tabelaPreco`. Relações em `Servico`: `tabelaPrecos`, `itensPedido`, `itensOrcamento`, `favoritos`. `codigo` é `@unique`.

**Frontend** (`apps/web-admin/src`):
- `Servico` type em `@/app/(dashboard)/pedidos/types` (campos: id, codigo, codigoLegado?, categoria, nome, precoBase, precoRotina, precoPesquisa, tipo?, variante1..5?).
- `api` (`@/lib/api`): `api.get/post/patch/delete<T>(path, body?)`, paths com `/` inicial.
- Design system `@/components/ui/*`: `Button` (variant/size/loading), `Badge`, `Input` (label), `Select` (label, options).
- `CATEGORIA_CORES` definido (não exportado) em `ServicoSearchInput.tsx` — duplicar helper local.
- Pedido Guiado (`pedidos-guiado/page.tsx`) tem hoje INLINE: estado `clienteId/observacoes/status/itens/saving/saved/clientes`, `addServico`, `removeItem`, `updateItem`, `toggleFav`(fica na página), `handleSalvar`, derivados `cliente/isPesquisador/priceKey/totalGeral`, helpers `fmtBRL/itemSubtotal`.

---

## Mapa de arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `apps/api/prisma/schema.prisma` (campo observacoes) |
| Criar | `apps/api/prisma/migrations/<ts>_servico_observacoes/migration.sql` (via prisma) |
| Criar | `apps/api/src/pedidos/dto/update-servico.dto.ts` |
| Criar | `apps/api/src/pedidos/dto/arquivar-servico.dto.ts` |
| Criar | `apps/api/src/pedidos/dto/filter-servico.dto.ts` |
| Modificar | `apps/api/src/pedidos/pedidos.service.ts` (filtro + atualizar/arquivar/remover + observacoes) |
| Modificar | `apps/api/src/pedidos/pedidos.controller.ts` (3 rotas novas + filtro) |
| Criar | `apps/web-admin/src/hooks/useOrderCart.ts` |
| Modificar | `apps/web-admin/src/app/(dashboard)/pedidos-guiado/page.tsx` (consumir hook) |
| Modificar | `apps/web-admin/src/app/(dashboard)/pedidos/types.ts` (observacoes?) |
| Criar | `apps/web-admin/src/components/legado/ServicoFormModal.tsx` |
| Criar | `apps/web-admin/src/components/legado/ServicoLegadoTable.tsx` |
| Criar | `apps/web-admin/src/app/(dashboard)/pedidos-legado/page.tsx` |
| Modificar | `apps/web-admin/src/app/(dashboard)/layout.tsx` (item de menu) |

Comandos backend a partir de `apps/api/`; frontend a partir de `apps/web-admin/`.

---

## Task 1: Migration — campo `observacoes`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Adicionar o campo ao model `Servico`**

Em `schema.prisma`, dentro de `model Servico`, após a linha `precoPesquisa Decimal @default(0) @db.Decimal(10, 2)`, adicionar:

```prisma
  observacoes   String? @db.Text
```

- [ ] **Step 2: Gerar a migration**

```bash
cd apps/api && npx prisma migrate dev --name servico_observacoes
```
Esperado: cria `prisma/migrations/<ts>_servico_observacoes/` e regenera o client. Se o banco não estiver acessível no ambiente, rodar ao menos `npx prisma generate` e criar a migration SQL manualmente:
```sql
ALTER TABLE "Servico" ADD COLUMN "observacoes" TEXT;
```

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add apps/api/prisma/schema.prisma apps/api/prisma/migrations && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): add observacoes field to Servico

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: DTOs de serviço

**Files:**
- Create: `apps/api/src/pedidos/dto/update-servico.dto.ts`
- Create: `apps/api/src/pedidos/dto/arquivar-servico.dto.ts`
- Create: `apps/api/src/pedidos/dto/filter-servico.dto.ts`

- [ ] **Step 1: Criar `update-servico.dto.ts`**

```ts
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class UpdateServicoDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsString() codigo?: string;
  @IsOptional() @IsNumber() @Min(0) precoRotina?: number;
  @IsOptional() @IsNumber() @Min(0) precoPesquisa?: number;
  @IsOptional() @IsString() observacoes?: string;
  @IsOptional() @IsString() variante1?: string;
  @IsOptional() @IsString() variante2?: string;
  @IsOptional() @IsString() variante3?: string;
  @IsOptional() @IsString() variante4?: string;
  @IsOptional() @IsString() variante5?: string;
}
```

- [ ] **Step 2: Criar `arquivar-servico.dto.ts`**

```ts
import { IsBoolean } from 'class-validator';

export class ArquivarServicoDto {
  @IsBoolean() ativo: boolean;
}
```

- [ ] **Step 3: Criar `filter-servico.dto.ts`**

```ts
import { IsOptional, IsString, IsBooleanString } from 'class-validator';

export class FilterServicoDto {
  @IsOptional() @IsString() busca?: string;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsBooleanString() incluirInativos?: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/pedidos/dto/update-servico.dto.ts apps/api/src/pedidos/dto/arquivar-servico.dto.ts apps/api/src/pedidos/dto/filter-servico.dto.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): DTOs for servico update/archive/filter

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Service methods + controller routes

**Files:**
- Modify: `apps/api/src/pedidos/pedidos.service.ts`
- Modify: `apps/api/src/pedidos/pedidos.controller.ts`

- [ ] **Step 1: Importar `ConflictException` no service**

Em `pedidos.service.ts`, trocar o bloco de import de `@nestjs/common`:
```ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
```
E importar os DTOs no topo (após os imports de pedido DTOs):
```ts
import { UpdateServicoDto } from './dto/update-servico.dto';
import { FilterServicoDto } from './dto/filter-servico.dto';
```

- [ ] **Step 2: Incluir `observacoes` em `criarServico`**

No objeto `data` de `criarServico` (após `variante5`), adicionar e ampliar o tipo do dto:
```ts
        variante5:    dto.variante5 ?? null,
        observacoes:  dto.observacoes ?? null,
```
E no tipo do parâmetro `dto`, adicionar `observacoes?: string`.

- [ ] **Step 3: Substituir `listarServicos` por versão com filtro**

Trocar o método `listarServicos()` inteiro por:
```ts
  async listarServicos(filter?: FilterServicoDto) {
    const where: any = {};
    if (!filter?.incluirInativos || filter.incluirInativos === 'false') {
      where.ativo = true;
    }
    if (filter?.categoria) where.categoria = filter.categoria;
    if (filter?.busca) {
      const q = filter.busca.trim();
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { codigo: { contains: q, mode: 'insensitive' } },
      ];
      const asNum = parseInt(q, 10);
      if (!Number.isNaN(asNum)) where.OR.push({ codigoLegado: asNum });
    }
    const servicos = await this.prisma.servico.findMany({
      where,
      select: {
        id: true, codigo: true, codigoLegado: true, categoria: true,
        nome: true, precoBase: true, precoRotina: true, precoPesquisa: true,
        ativo: true, observacoes: true,
        variante1: true, variante2: true, variante3: true, variante4: true, variante5: true,
      },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });
    return servicos.map((s) => ({
      ...s,
      precoBase:     Number(s.precoBase),
      precoRotina:   Number(s.precoRotina),
      precoPesquisa: Number(s.precoPesquisa),
    }));
  }
```

- [ ] **Step 4: Adicionar `atualizarServico`, `arquivarServico`, `removerServico`**

Logo após `listarServicos`, adicionar:
```ts
  // ── Editar serviço ──────────────────────────────────────────────────────────
  async atualizarServico(id: number, dto: UpdateServicoDto) {
    const atual = await this.prisma.servico.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Serviço não encontrado');

    if (dto.codigo && dto.codigo !== atual.codigo) {
      const dup = await this.prisma.servico.findUnique({ where: { codigo: dto.codigo } });
      if (dup) throw new ConflictException('Já existe um serviço com esse código');
    }

    const data: any = { ...dto };
    if (dto.precoRotina != null) data.precoBase = dto.precoRotina;

    const servico = await this.prisma.servico.update({ where: { id }, data });
    return {
      ...servico,
      precoBase: Number(servico.precoBase),
      precoRotina: Number(servico.precoRotina),
      precoPesquisa: Number(servico.precoPesquisa),
    };
  }

  // ── Arquivar / desarquivar ──────────────────────────────────────────────────
  async arquivarServico(id: number, ativo: boolean) {
    const atual = await this.prisma.servico.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Serviço não encontrado');
    const servico = await this.prisma.servico.update({ where: { id }, data: { ativo } });
    return { id: servico.id, ativo: servico.ativo };
  }

  // ── Deletar (só se nunca usado) ──────────────────────────────────────────────
  async removerServico(id: number) {
    const atual = await this.prisma.servico.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Serviço não encontrado');

    const [usosPedido, usosOrcamento] = await Promise.all([
      this.prisma.itemPedido.count({ where: { servicoId: id } }),
      this.prisma.itemOrcamento.count({ where: { servicoId: id } }),
    ]);
    if (usosPedido + usosOrcamento > 0) {
      throw new ConflictException(
        'Serviço em uso em pedidos/orçamentos — arquive em vez de deletar',
      );
    }

    await this.prisma.$transaction([
      this.prisma.servicoFavorito.deleteMany({ where: { servicoId: id } }),
      this.prisma.tabelaPreco.deleteMany({ where: { servicoId: id } }),
      this.prisma.servico.delete({ where: { id } }),
    ]);
    return { id, deleted: true };
  }
```

- [ ] **Step 5: Adicionar rotas no controller**

Em `pedidos.controller.ts`, importar os DTOs (após os imports de pedido DTOs):
```ts
import { UpdateServicoDto } from './dto/update-servico.dto';
import { ArquivarServicoDto } from './dto/arquivar-servico.dto';
import { FilterServicoDto } from './dto/filter-servico.dto';
```
Trocar o handler `listarServicos` (linhas ~30-34) por:
```ts
  @Get('servicos')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  listarServicos(@Query() filter: FilterServicoDto) {
    return this.service.listarServicos(filter);
  }
```
Ampliar o body de `criarServico` para aceitar `observacoes?: string` (adicionar à tipagem inline do `@Body()`).
Adicionar, junto às outras sub-rotas de `servicos` (antes do bloco "CRUD principal"):
```ts
  /** Editar serviço (campos do formato legado) */
  @Patch('servicos/:id')
  @Roles('gerencia', 'recepcao')
  atualizarServico(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServicoDto,
  ) {
    return this.service.atualizarServico(id, dto);
  }

  /** Arquivar / desarquivar serviço */
  @Patch('servicos/:id/arquivar')
  @Roles('gerencia', 'recepcao')
  arquivarServico(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ArquivarServicoDto,
  ) {
    return this.service.arquivarServico(id, dto.ativo);
  }

  /** Deletar serviço (bloqueia se em uso) */
  @Delete('servicos/:id')
  @Roles('gerencia')
  removerServico(@Param('id', ParseIntPipe) id: number) {
    return this.service.removerServico(id);
  }
```

- [ ] **Step 6: Typecheck/build do backend**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -10
```
Esperado: sem erros. (Se o ambiente tiver banco: `npm run build`.)

- [ ] **Step 7: Commit**

```bash
cd ../.. && git add apps/api/src/pedidos/pedidos.service.ts apps/api/src/pedidos/pedidos.controller.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(api): servico update/archive/delete endpoints + filtered list

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Extrair `useOrderCart` e refatorar Pedido Guiado

**Files:**
- Create: `apps/web-admin/src/hooks/useOrderCart.ts`
- Modify: `apps/web-admin/src/app/(dashboard)/pedidos-guiado/page.tsx`
- Modify: `apps/web-admin/src/app/(dashboard)/pedidos/types.ts`

- [ ] **Step 1: Adicionar `observacoes?` ao type Servico**

Em `pedidos/types.ts`, no type `Servico`, após `precoPesquisa: number`, adicionar:
```ts
  observacoes?: string | null
```

- [ ] **Step 2: Criar `src/hooks/useOrderCart.ts`**

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'

export type ClienteOpt = {
  id: number
  nome: string
  nomeFantasia?: string | null
  segmento: string
}

export type OrderCartItem = {
  key: string
  servicoId: number
  nome: string
  categoria: string
  quantidade: number
  preco: number
  desconto: number
}

export function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function itemSubtotal(item: OrderCartItem) {
  return item.preco * item.quantidade * (1 - item.desconto / 100)
}

export function useOrderCart() {
  const [clienteId, setClienteId]     = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens]             = useState<OrderCartItem[]>([])
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [clientes, setClientes]       = useState<ClienteOpt[]>([])

  useEffect(() => {
    api.get<{ data: ClienteOpt[] }>('/clientes?limit=500&ativo=true')
      .then((res) => setClientes(res.data))
      .catch(() => toast.error('Erro ao carregar clientes'))
  }, [])

  const cliente = clientes.find((c) => String(c.id) === clienteId)
  const isPesquisador = cliente?.segmento === 'pesquisador'
  const priceKey = isPesquisador ? 'precoPesquisa' : 'precoRotina'

  const addServico = useCallback(async (s: Servico) => {
    let preco = Number(s[priceKey as keyof Servico] ?? s.precoRotina)
    let desconto = 0
    if (clienteId) {
      try {
        const res = await api.get<{ preco: number; desconto: number }>(
          `/pedidos/preco?clienteId=${clienteId}&servicoId=${s.id}`,
        )
        preco = res.preco
        desconto = res.desconto ?? 0
      } catch {}
    }
    setItens((prev) => [
      ...prev,
      { key: `${s.id}-${Date.now()}`, servicoId: s.id, nome: s.nome, categoria: s.categoria, quantidade: 1, preco, desconto },
    ])
    toast.success(`"${s.nome}" adicionado`)
  }, [clienteId, priceKey])

  function removeItem(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key))
  }

  function updateItem(key: string, field: 'quantidade' | 'preco' | 'desconto', value: number) {
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)))
  }

  async function handleSalvar(finalStatus: 'rascunho' | 'enviado') {
    if (!clienteId) { toast.error('Selecione um cliente.'); return }
    if (itens.length === 0) { toast.error('Adicione pelo menos um serviço.'); return }
    setSaving(true)
    try {
      await api.post('/pedidos', {
        clienteId: parseInt(clienteId),
        observacoes: observacoes || undefined,
        status: finalStatus,
        itens: itens.map((i) => ({ servicoId: i.servicoId, quantidade: i.quantidade, preco: i.preco, desconto: i.desconto })),
      })
      setSaved(true)
      toast.success(finalStatus === 'enviado' ? 'Pedido enviado!' : 'Rascunho salvo!')
      setTimeout(() => { setItens([]); setClienteId(''); setObservacoes(''); setSaved(false) }, 2000)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar pedido')
    } finally {
      setSaving(false)
    }
  }

  const totalGeral = itens.reduce((sum, i) => sum + itemSubtotal(i), 0)

  return {
    clienteId, setClienteId, observacoes, setObservacoes, itens, saving, saved, clientes,
    cliente, isPesquisador, totalGeral,
    addServico, removeItem, updateItem, handleSalvar,
  }
}
```

- [ ] **Step 3: Refatorar `pedidos-guiado/page.tsx` para consumir o hook**

No `pedidos-guiado/page.tsx`:
1. Remover os helpers locais `fmtBRL` e `itemSubtotal` (linhas 41-47) e o `type ClienteOpt` (já vêm do hook). Manter `type Tab` e `type ItemForm` removido em favor de `OrderCartItem`.
2. Adicionar import:
```ts
import { useOrderCart, fmtBRL, itemSubtotal, type OrderCartItem } from '@/hooks/useOrderCart'
```
3. Dentro do componente, substituir as declarações de estado do carrinho (clienteId, observacoes, itens, saving, saved, clientes, e os derivados cliente/isPesquisador/priceKey/totalGeral, e as funções addServico/removeItem/updateItem/handleSalvar) por:
```ts
  const {
    clienteId, setClienteId, observacoes, setObservacoes, itens, saving, saved, clientes,
    cliente, isPesquisador, totalGeral,
    addServico, removeItem, updateItem, handleSalvar,
  } = useOrderCart()
```
   Manter o estado específico do guiado: `status`(remover — não usado pelo submit do hook; o hook recebe o status no handleSalvar), `populares/favoritos/historico/allServicos/tab/favIds/userId` e seus `useEffect`/`toggleFav` (esses NÃO vão para o hook).
4. Onde o JSX referencia `item.` nos itens, o tipo agora é `OrderCartItem` (mesmos campos) — nenhuma mudança de markup.
5. Remover o `useEffect` que carrega `clientes` (agora no hook) — manter o que carrega populares/allServicos/favoritos.

- [ ] **Step 4: Typecheck + build + validar guiado**

```bash
cd apps/web-admin && npx tsc --noEmit 2>&1 | tail -10 && npm run build 2>&1 | tail -8
```
Esperado: sem erros; rota `/pedidos-guiado` compila. As 5 abas e o resumo permanecem idênticos.

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add apps/web-admin/src/hooks/useOrderCart.ts "apps/web-admin/src/app/(dashboard)/pedidos-guiado/page.tsx" apps/web-admin/src/app/\(dashboard\)/pedidos/types.ts && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "refactor(web-admin): extract useOrderCart hook, reuse in pedido guiado

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: ServicoFormModal (editar/criar)

**Files:**
- Create: `apps/web-admin/src/components/legado/ServicoFormModal.tsx`

- [ ] **Step 1: Criar o componente**

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

const CATEGORIAS = [
  'Macroscopia','Processamento','Criostato','Cortes Histológico','Cortes Eppendorf',
  'Colorações','Coloração Específica','Imunohistoquímica','Imunofluorescência',
  'Citologia','Análises','Laudos','Imagem','Outros',
  'Descarte/Devolução','IPOG','Insumos/Materiais','Anticorpo','Logística',
  'Consultoria/Serviços','Manutenção',
].map((v) => ({ value: v, label: v }))

interface Props {
  /** serviço a editar; ausente = modo criar */
  servico?: Servico
  /** nome inicial sugerido no modo criar */
  initialNome?: string
  onClose: () => void
  onSaved: (s: Servico) => void
}

export function ServicoFormModal({ servico, initialNome, onClose, onSaved }: Props) {
  const editing = !!servico
  const [nome, setNome]                   = useState(servico?.nome ?? initialNome ?? '')
  const [categoria, setCategoria]         = useState(servico?.categoria ?? 'Outros')
  const [codigo, setCodigo]               = useState(servico?.codigo ?? '')
  const [precoRotina, setPrecoRotina]     = useState(String(servico?.precoRotina ?? ''))
  const [precoPesquisa, setPrecoPesquisa] = useState(String(servico?.precoPesquisa ?? ''))
  const [observacoes, setObservacoes]     = useState(servico?.observacoes ?? '')
  const [v1, setV1] = useState(servico?.variante1 ?? '')
  const [v2, setV2] = useState(servico?.variante2 ?? '')
  const [v3, setV3] = useState(servico?.variante3 ?? '')
  const [v4, setV4] = useState(servico?.variante4 ?? '')
  const [v5, setV5] = useState(servico?.variante5 ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !precoRotina) {
      toast.error('Nome e preço rotina são obrigatórios.')
      return
    }
    setSaving(true)
    const rot = parseFloat(precoRotina)
    const pes = parseFloat(precoPesquisa) || rot
    try {
      let saved: Servico
      if (editing) {
        saved = await api.patch<Servico>(`/pedidos/servicos/${servico!.id}`, {
          nome: nome.trim(), categoria, codigo: codigo.trim() || undefined,
          precoRotina: rot, precoPesquisa: pes, observacoes: observacoes || undefined,
          variante1: v1 || undefined, variante2: v2 || undefined, variante3: v3 || undefined,
          variante4: v4 || undefined, variante5: v5 || undefined,
        })
        toast.success('Serviço atualizado!')
      } else {
        saved = await api.post<Servico>('/pedidos/servicos/novo', {
          codigo: codigo.trim() || `CUSTOM-${Date.now()}`,
          categoria, nome: nome.trim(),
          precoBase: rot, precoRotina: rot, precoPesquisa: pes,
          observacoes: observacoes || undefined,
          variante1: v1 || undefined, variante2: v2 || undefined, variante3: v3 || undefined,
          variante4: v4 || undefined, variante5: v5 || undefined,
        })
        toast.success('Serviço criado!')
      }
      onSaved(saved)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar serviço')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            {editing ? 'Editar serviço' : 'Novo serviço'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Serviço Base (nome) *" value={nome} onChange={(e) => setNome(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={CATEGORIAS} />
            <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder={editing ? '' : 'auto se vazio'} />
          </div>
          <div className="grid grid-cols-5 gap-2">
            <Input label="Var 1" value={v1} onChange={(e) => setV1(e.target.value)} />
            <Input label="Var 2" value={v2} onChange={(e) => setV2(e.target.value)} />
            <Input label="Var 3" value={v3} onChange={(e) => setV3(e.target.value)} />
            <Input label="Var 4" value={v4} onChange={(e) => setV4(e.target.value)} />
            <Input label="Var 5" value={v5} onChange={(e) => setV5(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor Rotina (R$) *" type="number" min="0" step="0.01" value={precoRotina} onChange={(e) => setPrecoRotina(e.target.value)} placeholder="0,00" />
            <Input label="Valor Pesquisa (R$)" type="number" min="0" step="0.01" value={precoPesquisa} onChange={(e) => setPrecoPesquisa(e.target.value)} placeholder="= rotina" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-admin/src/components/legado/ServicoFormModal.tsx && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(legado): servico edit/create modal with all legacy fields

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: ServicoLegadoTable

**Files:**
- Create: `apps/web-admin/src/components/legado/ServicoLegadoTable.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Search, Plus, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Servico } from '@/app/(dashboard)/pedidos/types'
import { fmtBRL } from '@/hooks/useOrderCart'
import { ServicoFormModal } from './ServicoFormModal'

type ServicoRow = Servico & { ativo?: boolean }

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function variantes(s: Servico) {
  return [s.variante1, s.variante2, s.variante3, s.variante4, s.variante5].filter(Boolean).join(' · ')
}

interface Props {
  isPesquisador: boolean
  onAdd: (s: Servico) => void | Promise<void>
}

export function ServicoLegadoTable({ isPesquisador, onAdd }: Props) {
  const [servicos, setServicos]       = useState<ServicoRow[]>([])
  const [query, setQuery]             = useState('')
  const [categoria, setCategoria]     = useState('')
  const [showInativos, setShowInativos] = useState(false)
  const [editing, setEditing]         = useState<Servico | null>(null)
  const [creating, setCreating]       = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (showInativos) params.set('incluirInativos', 'true')
    api.get<ServicoRow[]>(`/pedidos/servicos${params.toString() ? '?' + params : ''}`)
      .then(setServicos)
      .catch(() => toast.error('Erro ao carregar serviços'))
  }, [showInativos])

  useEffect(() => { load() }, [load])

  const categorias = useMemo(
    () => Array.from(new Set(servicos.map((s) => s.categoria))).sort(),
    [servicos],
  )

  const rows = useMemo(() => {
    const q = norm(query.trim())
    return servicos.filter((s) => {
      if (categoria && s.categoria !== categoria) return false
      if (!q) return true
      return norm(s.nome).includes(q) || s.codigo.toLowerCase().includes(q) ||
        (s.codigoLegado != null && String(s.codigoLegado).includes(q))
    })
  }, [servicos, query, categoria])

  async function arquivar(s: ServicoRow) {
    try {
      await api.patch(`/pedidos/servicos/${s.id}/arquivar`, { ativo: !(s.ativo ?? true) })
      toast.success((s.ativo ?? true) ? 'Serviço arquivado' : 'Serviço desarquivado')
      load()
    } catch (err: any) { toast.error(err.message ?? 'Erro ao arquivar') }
  }

  async function deletar(s: ServicoRow) {
    if (!confirm(`Deletar "${s.nome}"? Esta ação é permanente.`)) return
    try {
      await api.delete(`/pedidos/servicos/${s.id}`)
      toast.success('Serviço deletado')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Serviço em uso — arquive em vez de deletar')
    }
  }

  const preco = (s: Servico) => (isPesquisador ? s.precoPesquisa : s.precoRotina)

  return (
    <div className="space-y-3">
      {/* Busca + ações */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código ou nome…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={showInativos} onChange={(e) => setShowInativos(e.target.checked)} />
          Mostrar arquivados
        </label>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium px-3 py-2"
        >
          <Plus className="h-3.5 w-3.5" /> Novo serviço
        </button>
      </div>

      {/* Pills de categoria */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoria('')}
          className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full ${!categoria ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
        >Todas</button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoria(cat === categoria ? '' : cat)}
            className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full ${categoria === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >{cat}</button>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Serviço Base</th>
                <th className="px-3 py-2 font-medium">Variantes</th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium text-right">Rotina</th>
                <th className="px-3 py-2 font-medium text-right">Pesquisa</th>
                <th className="px-3 py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${s.ativo === false ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{s.categoria}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{s.nome}</td>
                  <td className="px-3 py-2 text-slate-400">{variantes(s)}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{s.codigo}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(s.precoRotina))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(s.precoPesquisa))}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => onAdd(s)} title="Adicionar ao pedido" className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditing(s)} title="Editar" className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => arquivar(s)} title={s.ativo === false ? 'Desarquivar' : 'Arquivar'} className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded">
                        {s.ativo === false ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => deletar(s)} title="Deletar" className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    Nenhum serviço encontrado.
                    {query && (
                      <button onClick={() => setCreating(true)} className="ml-2 text-blue-600 font-medium hover:underline">
                        Criar "{query}"?
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ServicoFormModal servico={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
      {creating && (
        <ServicoFormModal initialNome={query} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-admin/src/components/legado/ServicoLegadoTable.tsx && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(legado): legacy-format service table with search, filter and CRUD actions

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Página /pedidos-legado

**Files:**
- Create: `apps/web-admin/src/app/(dashboard)/pedidos-legado/page.tsx`

- [ ] **Step 1: Criar a página**

```tsx
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
        {isPesquisador && (
          <Badge variant="amber">Preço Pesquisa</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
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
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web-admin/src/app/(dashboard)/pedidos-legado/page.tsx" && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(legado): pedido legado page with legacy table + order summary

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Item de menu

**Files:**
- Modify: `apps/web-admin/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Adicionar o item de menu**

Em `layout.tsx`, importar `FileSpreadsheet` de `lucide-react` (juntar ao import de ícones existente). No array `menuItems`, logo após a entrada de `/pedidos-guiado`, adicionar:
```tsx
  { href: '/pedidos-legado', label: 'Pedido Legado', icon: FileSpreadsheet },
```
(Se o `menuItems` usar emoji string em vez de componente de ícone, seguir o formato vigente do arquivo: usar o mesmo estilo dos itens vizinhos.)

- [ ] **Step 2: Typecheck + build**

```bash
cd apps/web-admin && npx tsc --noEmit 2>&1 | tail -10 && npm run build 2>&1 | tail -10
```
Esperado: sem erros; rota `/pedidos-legado` listada no build.

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add "apps/web-admin/src/app/(dashboard)/layout.tsx" && git -c user.email=fer.jorge@gmail.com -c user.name="Fernando Jorge" commit -m "feat(legado): add Pedido Legado menu item

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Verificação final + push

- [ ] **Step 1: Build completo do monorepo**

```bash
npm run build 2>&1 | tail -20
```
Esperado: api e web-admin compilam.

- [ ] **Step 2: Validação manual (se ambiente permitir)**

```bash
npm run dev:admin   # http://localhost:3002/pedidos-legado
```
Checar: tabela carrega no formato legado; busca por código foca/filtra; adicionar ao carrinho soma com preço por cliente; editar persiste; criar serviço novo; arquivar/desarquivar; deletar serviço em uso → toast de bloqueio; enviar pedido; Pedido Guiado continua idêntico.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Confirmar**

```bash
git log origin/main --oneline -10
```
