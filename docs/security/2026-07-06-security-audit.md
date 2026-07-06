# Security Audit — Histocell — 2026-07-06

Stack: monorepo Turborepo (npm) · **apps/api** NestJS 10 + Prisma + JWT/RBAC · **apps/web-admin** e **apps/web-cliente** (Next.js) · Postgres · deploy Coolify/Docker.
Contexto: **laboratório de anatomia patológica** — dados médicos/PHI (laudos) e financeiros sob **LGPD** (dado sensível de saúde, Art. 11). Portal externo de cliente + painel interno.
Método: 4 subagentes (auth+throttler, RBAC admin, portal/PHI, web+infra) + leitura dos crux. Cada achado confirmado em código.

**Achados: 🔴 2 crítico · 🟠 3 alto · 🟡 9 médio · 🟢 6 baixo**

> Veredito: o app tem **boas bases** (isolamento do portal por `clienteId` sem IDOR, token 128-bit, bcrypt 12, `RolesGuard` re-checando no banco, `ValidationPipe` com `forbidNonWhitelisted`, CORS não-wildcard, Swagger off em prod). Mas tem **dois furos críticos** que precisam ser resolvidos com urgência — um deles expõe credencial de admin em produção — e um conjunto relevante de hardening, com ângulo **LGPD/PHI** que merece atenção especial.

---

## O que já está CORRETO (verificado)

- **Portal sem IDOR** — `resolverCliente(token)` + todo query escopado por `clienteId`; `laudoArquivo` faz `findFirst({ where: { id, liberado:true, pedido:{ clienteId } } })`. Cliente não acessa dado de outro.
- **Token do portal forte** — `randomBytes(16)` = 128-bit CSPRNG (não adivinhável/enumerável).
- **RBAC re-checa no banco** (`roles.guard.ts`) — role + `ativo` a cada request; token de usuário desativado/rebaixado é recusado.
- **Sem endpoint de registro** → sem self-assign de role. bcrypt cost 12. `ValidationPipe({ whitelist, forbidNonWhitelisted })`. Login com mensagem genérica. `JWT_SECRET` sem fallback. CORS por env (não `*`). Swagger só em dev. Sem secret commitado; `.gitignore`/`.dockerignore` corretos. Web Dockerfiles non-root.

---

## 🔴 Crítico

### C1. Rate limiting está INERTE — login e portal sem qualquer limite
- **Onde:** `apps/api/src/app.module.ts:29` (registra `ThrottlerModule.forRoot`) — mas **não há `providers`/`APP_GUARD`** e `ThrottlerGuard` **não aparece em lugar nenhum** do código (grep = 0).
- **Evidência:** o `@Throttle({ ttl:900000, limit:5 })` no `auth.controller.ts:19` e o limite global de 30/min são **decorativos** — sem `ThrottlerGuard` ativo, não impõem nada.
- **Risco:** brute-force/credential-stuffing ilimitado contra `POST /auth/login` (sistema médico, sem lockout — ver M6); e o portal PHI fica sem throttle (scraping/DoS de laudos).
- **Correção (1 linha):** em `AppModule.providers`, `{ provide: APP_GUARD, useClass: ThrottlerGuard }`. Isso ativa o global 30/min **e** o `@Throttle` do login. Ver `vibesec` › Password Security.

### C2. Senha de admin hardcoded no seed, executado em toda deploy de produção
- **Onde:** `apps/api/prisma/seed.ts:97` (`bcrypt.hash('Histocell@2026', 12)`) aplicada às contas `gerencia` `celio@histocell.com.br` e `kleber@histocell.com.br` (`:100-101`); `apps/api/docker-entrypoint.sh` passo 4 roda `node dist/prisma/seed.js` **em todo deploy**.
- **Risco:** as contas de maior privilégio sobem com uma senha **conhecida e commitada**. Quem tiver acesso ao repo (ou se ele vazar) tem admin do sistema médico. **Verificar também** se o `upsert.update` reseta a senha a cada deploy — se sim, reverte qualquer troca feita pelos admins.
- **Correção:** senha inicial vinda de env (`SEED_ADMIN_PASSWORD`) ou trocar para fluxo de "primeiro acesso" (senha aleatória + reset obrigatório). Rotacionar as senhas das contas reais **agora**. Nunca commitar credencial. Ver `vibesec` › Sensitive Data Exposure.

---

## 🟠 Alto

### A1. `GET /clientes` e `/clientes/:id` sem `@Roles` → cliente logado enumera toda a base de clientes
- **Onde:** `apps/api/src/clientes/clientes.controller.ts:32,42`. A classe tem `RolesGuard`, mas essas duas rotas **não têm `@Roles`** → o guard passa qualquer autenticado.
- **Precondição confirmada:** o `login()` (`auth.service.ts:12`) **não exclui** `role='cliente'`, e o `apps/web-cliente/src/app/login/page.tsx:26` faz login e guarda `accessToken`. Ou seja, **clientes obtêm JWT**.
- **Risco:** um cliente logado faz `GET /clientes/:id` em loop e lê CNPJ, endereços e contatos de **todos os clientes** (concorrentes inclusive). Vazamento de PII em massa.
- **Correção:** `@Roles('gerencia','recepcao','financeiro','tecnico')` nas duas rotas (só roles internas).

### A2. Token do portal é permanente, sem expiração nem revogação — guardando PHI
- **Onde:** `apps/api/prisma/schema.prisma:73` (`portalToken` sem campo de expiração); rotação só manual via admin (`clientes.service.ts:269`).
- **Risco:** o link do portal é uma credencial de PHI (laudos/PDFs) que **nunca morre**. Qualquer vazamento (e-mail encaminhado, histórico num PC compartilhado, log de proxy) dá acesso permanente aos laudos até um humano rotacionar. Fraqueza central do modelo sob LGPD.
- **Correção:** coluna de expiração + rotação agendada; e/ou exigir 2º fator (login/OTP) antes de servir o PDF do laudo.

### A3. JWT em `localStorage` nos dois apps web, sem CSP → XSS rouba sessão de gerência
- **Onde:** `apps/web-admin/src/app/login/page.tsx:31` e `apps/web-cliente/.../login/page.tsx:26` (`localStorage.setItem('token', ...)`); nenhum `next.config.js` define CSP.
- **Risco:** qualquer XSS lê o JWT (token de maior valor, gerência num sistema médico) e personifica o usuário. Sem CSP, não há segunda camada.
- **Correção:** migrar para cookie `httpOnly` (BFF) e/ou, no mínimo, adicionar CSP (ver A3/M5) enquanto isso. Ver `vibesec` › JWT Security / Sensitive Data.

---

## 🟡 Médio

- **M1. `tecnico` libera/assina laudo com `assinadoPor` vindo do body** — `laudos.controller.ts:41` (`@Roles('gerencia','recepcao','tecnico')`), `laudos.service.ts:69` seta `assinadoPor` do request. Integridade/não-repúdio de laudo (PHI): qualquer técnico "assina" com nome arbitrário. Fix: restringir a `gerencia`/`patologista`, derivar `assinadoPor` de `req.user`, e validar o body com DTO.
- **M2. PHI (token) na URL, incl. rota do PDF** — `portal.controller.ts:51` `GET /portal/:token/laudo/:id/arquivo`. Vaza em log/histórico/Referer. Fix: `Referrer-Policy: no-referrer` + mover token para header/URL assinada de curta duração no PDF.
- **M3. Sem audit trail de acesso a laudo no portal** — `AuditService.log(userId)` exige userId; portal não tem user → acesso a PHI não é logado (gap LGPD Art. 11 / resposta a incidente). Fix: log por `clienteId`+IP+userAgent+laudoId em cada leitura de PHI.
- **M4. `@Body()` com tipo inline escapa do ValidationPipe** — `laudos.controller.ts:33,45`, `pedidos.controller.ts:44` (preços de `criarServico` sem validação), `cobranca`/`comunicacao` com `@Body() body: any`. Fix: DTOs class-validator.
- **M5. Sem CSP/security headers nos 2 Next apps** — `next.config.js` sem `headers()`. Fix: bloco `headers()` com CSP + X-Frame-Options + HSTS + Referrer-Policy + nosniff.
- **M6. Sem account lockout no login** — `auth.service.ts`. Com C1 corrigido o throttle já mitiga; lockout é defense-in-depth.
- **M7. JWT sem pin de algoritmo + sem fail-fast em `JWT_SECRET` ausente** — `jwt.strategy.ts:10` (adicionar `algorithms:['HS256']`); `ConfigModule.forRoot` sem `validationSchema` (app sobe com secret indefinido).
- **M8. `comercial`/`qualidade` com `RolesGuard` sem `@Roles` (no-op latente)** — `comercial.controller.ts:6`, `qualidade.controller.ts:6`. Hoje vazios (TODO), mas qualquer rota nova abre pra todo autenticado. Fix: `@Roles(...)` de classe ou default-deny.
- **M9. Dockerfile da API roda como root** — `apps/api/Dockerfile` sem `USER` (os web têm). Fix: usuário non-root.

---

## 🟢 Baixo

- **B1.** Admin retorna `portalToken` em toda listagem de cliente — `clientes.service.ts:32` (`SELECT_SAFE`). Só devolver no `regenerarToken`.
- **B2.** Sem `middleware.ts` de proteção de rota nos web apps (gating só client-side; API é a autoridade real).
- **B3.** Access token de 12h + `RefreshToken` no schema **não implementado** (sem refresh/rotação/logout/revogação). Encurtar TTL e implementar ou remover o modelo morto.
- **B4.** `users` (lista de usuários) legível por `tecnico` (`users.controller.ts:13`). Sem rota de create/update → sem escalonamento.
- **B5.** Token de webhook comparado com `!==` (não constant-time) — `cobranca.service.ts:301`.
- **B6.** Postgres `dev123` em `docker-compose.yml:9` e `DEPLOY-GUIDE.md` (dev-only; marcar como tal). Login timing enumeration (`auth.service.ts` pula bcrypt no not-found) — equalizar com dummy compare.

---

## Ordem sugerida de remediação

1. **C1** — `APP_GUARD: ThrottlerGuard` (1 linha, ativa login + portal throttle).
2. **C2** — tirar a senha do seed (env/reset obrigatório) + **rotacionar as senhas reais agora**.
3. **A1** — `@Roles` nas rotas GET de `clientes`.
4. **A3/M5** — CSP nos 2 web apps (mitiga o localStorage enquanto não vira cookie httpOnly).
5. **M7** — pin de algoritmo + fail-fast no `JWT_SECRET`.
6. **M1** — travar liberação de laudo + `assinadoPor` do `req.user`.
7. **A2/M2/M3** — ciclo de vida do token do portal + Referrer-Policy + audit de PHI (batch LGPD).
8. **M4/M8/M9** + 🟢 — hardening incremental.

> Antes de produção/uso real com dados de pacientes: **C1, C2 e A1** são inadiáveis. O batch LGPD (A2/M2/M3) é o diferencial de um sistema que lida com laudos.
