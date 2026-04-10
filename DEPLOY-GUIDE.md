# 🚀 Histocell — Guia de Deploy no Coolify

## Arquitetura de Deploy

```
histocell-cliente.tudomudou.com.br  →  Next.js (Portal do Cliente)
histocell-admin.tudomudou.com.br    →  Next.js (Painel Admin)
api.histocell.tudomudou.com.br      →  NestJS (API compartilhada)
                                    →  PostgreSQL (Coolify managed)
```

## Estrutura do Monorepo (atualizada)

```
histocell/
├── apps/
│   ├── api/                    # NestJS — API backend
│   │   ├── src/
│   │   │   ├── auth/           # JWT + RBAC
│   │   │   ├── clientes/       # M01
│   │   │   ├── pedidos/        # M02
│   │   │   ├── recebimento/    # M03
│   │   │   ├── ordens/         # M04
│   │   │   ├── etiquetas/      # M06
│   │   │   ├── qualidade/      # M07
│   │   │   ├── comercial/      # M08
│   │   │   ├── financeiro/     # M09
│   │   │   └── relatorios/     # M10
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web-cliente/            # Next.js — Portal do Cliente
│   │   ├── src/app/
│   │   │   ├── login/          # Login com email/código
│   │   │   ├── pedidos/        # Novo pedido, meus pedidos
│   │   │   ├── laudos/         # Visualizar laudos
│   │   │   ├── financeiro/     # Boletos, relatórios
│   │   │   └── layout.tsx
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web-admin/              # Next.js — Painel Admin
│       ├── src/app/
│       │   ├── login/          # Login corporativo
│       │   ├── (dashboard)/
│       │   │   ├── cadastro/   # M01
│       │   │   ├── pedidos/    # M02 (recepção)
│       │   │   ├── recebimento/# M03
│       │   │   ├── ordens/     # M04
│       │   │   ├── etiquetas/  # M06
│       │   │   ├── qualidade/  # M07
│       │   │   ├── comercial/  # M08
│       │   │   ├── financeiro/ # M09
│       │   │   ├── relatorios/ # M10
│       │   │   └── dashboard/  # M11
│       │   └── layout.tsx
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── ui/                     # Componentes compartilhados
│   ├── config/                 # ESLint, TS config
│   └── types/                  # Types compartilhados
│
├── docker-compose.yml          # Para dev local
├── turbo.json
└── package.json
```

## Passo a Passo — Deploy

### 1. Cloudflare DNS

Criar 3 registros CNAME apontando para o IP da VPS:

```
histocell-cliente.tudomudou.com.br  →  CNAME  →  IP da VPS
histocell-admin.tudomudou.com.br    →  CNAME  →  IP da VPS
api-histocell.tudomudou.com.br      →  CNAME  →  IP da VPS
```

> **Importante:** Se usar proxy do Cloudflare (nuvem laranja), desativar para o SSL do Coolify funcionar. Ou usar Full (Strict) no Cloudflare SSL.

### 2. PostgreSQL no Coolify

No Coolify:
1. Ir em **Resources → New → Database → PostgreSQL**
2. Configurar:
   - Name: `histocell-db`
   - Database: `histocell`
   - User: `histocell`
   - Password: (gerar senha forte)
   - Port: 5432 (interno)
3. Anotar a **connection string interna**: 
   ```
   postgresql://histocell:SENHA@histocell-db:5432/histocell
   ```

### 3. Deploy da API (NestJS)

No Coolify:
1. **Resources → New → Application**
2. Source: **GitHub** → repo `jorguzz-fer/histocell`
3. Build Pack: **Dockerfile**
4. Dockerfile location: `apps/api/Dockerfile`
5. Base Directory: `.` (root do monorepo)
6. Domain: `api-histocell.tudomudou.com.br`
7. Port: `3001`

**Variáveis de ambiente:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://histocell:SENHA@histocell-db:5432/histocell
JWT_SECRET=gerar-chave-secreta-forte-aqui
JWT_EXPIRATION=7d
PORT=3001
CORS_ORIGINS=https://histocell-cliente.tudomudou.com.br,https://histocell-admin.tudomudou.com.br
```

### 4. Deploy do Web Cliente (Next.js)

No Coolify:
1. **Resources → New → Application**
2. Source: **GitHub** → mesmo repo
3. Build Pack: **Dockerfile**
4. Dockerfile location: `apps/web-cliente/Dockerfile`
5. Base Directory: `.`
6. Domain: `histocell-cliente.tudomudou.com.br`
7. Port: `3000`

**Variáveis de ambiente:**
```env
NEXT_PUBLIC_API_URL=https://api-histocell.tudomudou.com.br
NEXT_PUBLIC_APP_NAME=Histocell Portal
```

### 5. Deploy do Web Admin (Next.js)

No Coolify:
1. **Resources → New → Application**
2. Source: **GitHub** → mesmo repo
3. Build Pack: **Dockerfile**
4. Dockerfile location: `apps/web-admin/Dockerfile`
5. Base Directory: `.`
6. Domain: `histocell-admin.tudomudou.com.br`
7. Port: `3002`

**Variáveis de ambiente:**
```env
NEXT_PUBLIC_API_URL=https://api-histocell.tudomudou.com.br
NEXT_PUBLIC_APP_NAME=Histocell Admin
```

### 6. SSL

O Coolify gera SSL automático via Let's Encrypt para cada domínio. Basta marcar "Generate SSL" no deploy de cada application.

---

## Dockerfiles Necessários

### apps/api/Dockerfile
```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN npx turbo run build --filter=api
RUN cd apps/api && npx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

### apps/web-cliente/Dockerfile
```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/web-cliente/package.json ./apps/web-cliente/
COPY packages/ ./packages/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx turbo run build --filter=web-cliente

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web-cliente/.next/standalone ./
COPY --from=builder /app/apps/web-cliente/.next/static ./apps/web-cliente/.next/static
COPY --from=builder /app/apps/web-cliente/public ./apps/web-cliente/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web-cliente/server.js"]
```

### apps/web-admin/Dockerfile
```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/web-admin/package.json ./apps/web-admin/
COPY packages/ ./packages/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx turbo run build --filter=web-admin

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web-admin/.next/standalone ./
COPY --from=builder /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=builder /app/apps/web-admin/public ./apps/web-admin/public
USER nextjs
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/web-admin/server.js"]
```

---

## Dev Local (docker-compose.yml)

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: histocell
      POSTGRES_USER: histocell
      POSTGRES_PASSWORD: dev123
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://histocell:dev123@db:5432/histocell
      JWT_SECRET: dev-secret-key
      JWT_EXPIRATION: 7d
      PORT: 3001
      CORS_ORIGINS: http://localhost:3000,http://localhost:3002
    depends_on:
      - db

  web-cliente:
    build:
      context: .
      dockerfile: apps/web-cliente/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001

  web-admin:
    build:
      context: .
      dockerfile: apps/web-admin/Dockerfile
    ports:
      - "3002:3002"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001

volumes:
  pgdata:
```

---

## 🔒 Segurança — LGPD e Proteção de Dados

### Autenticação e Autorização

**JWT + Refresh Token:**
```
- Access Token: vida curta (15 min)
- Refresh Token: vida longa (7 dias), armazenado em httpOnly cookie
- Rotação de refresh token a cada uso (impede reuso)
- Blacklist de tokens revogados (logout, troca de senha)
```

**RBAC (Role-Based Access Control):**
```
Perfis de acesso no Admin:
├── gerencia    → acesso total (Célio, Kleber)
├── tecnico     → OS (fila), Etiquetas, Qualidade
├── recepcao    → Pedidos, Recebimento, Cadastro Rápido, Etiquetas
└── financeiro  → Financeiro, Relatórios, Cadastro

Portal do Cliente:
└── cliente     → seus pedidos, laudos, financeiro (só dados próprios)
```

**Middleware de autorização no NestJS:**
```typescript
// Guards em cada rota
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('gerencia', 'financeiro')
@Get('faturas')
```

### ⚠️ REGRA DE OURO: Validação SEMPRE no Backend

> **Dica de especialista em segurança:**
> "Sempre usar JWT e confirmar as roles no back. 
> Essas IAs quase sempre fazem no front.
> Digamos que no response vem 'customer'. Aí renderiza tudo de cliente.
> Dá pra interceptar e colocar 'admin'. Aí já era.
> Sempre validar no back, toda e qualquer rota."

**O que isso significa na prática:**

O frontend (Next.js) é **apenas visual** — ele esconde/mostra menus e botões
baseado no perfil, mas isso é só UX. A segurança real está no **backend**.

**❌ ERRADO — Validar role no frontend:**
```typescript
// NUNCA confiar nisso! O usuário pode alterar no DevTools/Proxy
const user = await api.get('/me'); // retorna { role: 'customer' }
if (user.role === 'admin') {
  showAdminPanel(); // Qualquer um pode interceptar e mudar pra 'admin'
}
```

**✅ CORRETO — Toda rota da API valida no backend:**
```typescript
// NestJS: Guard que SEMPRE verifica o JWT + role no banco
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Extraído do JWT VERIFICADO no backend
    
    // Busca role REAL no banco, não confia no que veio do front
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new UnauthorizedException();
    
    return requiredRoles.includes(dbUser.role);
  }
}
```

**Padrão para TODA rota da API:**
```typescript
// Rota de cliente — só vê SEUS dados
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('cliente')
@Get('pedidos')
async meusPedidos(@Request() req) {
  // FILTRA pelo ID do usuário logado, nunca aceita clienteId do front
  return this.pedidosService.findByCliente(req.user.clienteId);
}

// Rota admin — verifica perfil no banco
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('gerencia', 'recepcao')
@Get('pedidos/todos')
async todosPedidos() {
  return this.pedidosService.findAll();
}

// Desconto — só Célio (gerencia) pode aprovar
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('gerencia')
@Patch('orcamentos/:id/aprovar-desconto')
async aprovarDesconto(@Param('id') id: number, @Request() req) {
  // Log de auditoria com quem aprovou
  return this.comercialService.aprovarDesconto(id, req.user.id);
}
```

**Regras invioláveis:**
```
1. TODA rota da API tem @UseGuards(JwtAuthGuard)
2. Rotas restritas têm @Roles() além do JWT
3. Dados do cliente: SEMPRE filtrar por req.user.id/clienteId
4. NUNCA aceitar role/perfil vindo do body/query do frontend
5. NUNCA expor endpoints sem autenticação (exceto login e health)
6. Operações sensíveis: log de auditoria obrigatório
7. Portal do Cliente: API retorna APENAS dados daquele cliente
8. Admin: cada rota verifica se o perfil tem permissão
```

### Variáveis de Ambiente — .env.example

> **Dica de especialista:**
> "Pra subir o env no git, cria .env.example.
> Coloca só as chaves pra vc entender como usar depois.
> E no Coolify, só abrir as stacks, vai em environments e cola teu env lá."

**No repositório Git — `.env.example` (valores vazios):**
```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Criptografia LGPD (AES-256)
ENCRYPTION_KEY=

# Servidor
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://histocell-cliente.tudomudou.com.br,https://histocell-admin.tudomudou.com.br

# E-mail transacional (SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@histocell.com.br

# WhatsApp (Evolution API) — futuro
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=
```

**No `.gitignore`:**
```
.env
.env.local
.env.production
```

**No Coolify:** os valores reais ficam APENAS na aba "Environments" de cada serviço. Nunca no Git.

### Proteção de Senhas

```
- Bcrypt com salt rounds = 12 (nunca armazenar senha em texto plano)
- Validação de força mínima: 8 caracteres, 1 número, 1 maiúscula
- Rate limiting no login: máx 5 tentativas por IP em 15 min
- Bloqueio temporário após 10 tentativas falhas consecutivas
- Recuperação de senha via token com expiração de 1 hora
- Primeiro acesso: link único com validade de 48h
```

### LGPD — Lei Geral de Proteção de Dados

**Dados sensíveis tratados pelo sistema:**
```
- Dados pessoais de clientes (nome, CPF/CNPJ, e-mail, telefone, endereço)
- Dados de pacientes (tecido, diagnóstico inferred pelo tipo de exame)
- Dados financeiros (faturamento, cobranças, descontos)
- Logs de acesso e operações por colaborador
```

**Medidas implementadas:**
```
1. Criptografia em trânsito: HTTPS obrigatório (SSL/TLS via Coolify)
2. Criptografia em repouso: PostgreSQL com encryption at rest
3. Campos sensíveis criptografados no banco (CPF, dados financeiros)
4. Anonimização de dados em relatórios quando possível
5. Log de acesso a dados pessoais (quem acessou, quando)
6. Política de retenção: dados de pacientes por tempo legal, depois anonimizar
7. Direito de exclusão: endpoint para remover dados do cliente mediante solicitação
8. Consentimento: termo de aceite no primeiro acesso do Portal do Cliente
```

**Prisma — campos criptografados:**
```prisma
model Cliente {
  id          Int      @id @default(autoincrement())
  documento   String   @db.Text  // CPF/CNPJ criptografado com AES-256
  // ... demais campos
}
```

### Headers de Segurança HTTP

**Configurar no NestJS (helmet):**
```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet());
app.enableCors({
  origin: [
    'https://histocell-cliente.tudomudou.com.br',
    'https://histocell-admin.tudomudou.com.br'
  ],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE'],
});
```

**Headers aplicados:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

### Rate Limiting e Proteção contra Ataques

```typescript
// NestJS throttler
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot({
  ttl: 60,       // janela de 60 segundos
  limit: 30,     // máximo 30 requisições por IP
}),

// Login: rate limit mais agressivo
@Throttle(5, 900)  // 5 tentativas a cada 15 minutos
@Post('auth/login')
```

**Proteções adicionais:**
```
- CSRF tokens em formulários (double submit cookie)
- Sanitização de inputs (class-validator no NestJS)
- SQL injection: Prisma ORM (queries parametrizadas por padrão)
- XSS: React escapa por padrão + helmet CSP
- Validação de uploads: tipo, tamanho máximo, extensões permitidas
- API: não expor stack traces em produção
```

### Banco de Dados

```
- PostgreSQL sem acesso externo (rede interna do Coolify apenas)
- Senha forte gerada automaticamente (32+ caracteres)
- Backup automático diário (configurar no Coolify)
- Connection pooling via Prisma (evita exaustão de conexões)
- Migrations versionadas e auditáveis no Git
```

### Logs e Auditoria

```typescript
// Registrar toda operação sensível
@Injectable()
export class AuditService {
  async log(userId: number, action: string, entity: string, entityId: number, details?: any) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,     // CREATE, READ, UPDATE, DELETE, LOGIN, EXPORT
        entity,     // 'cliente', 'pedido', 'fatura', etc.
        entityId,
        details: details ? JSON.stringify(details) : null,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        createdAt: new Date(),
      }
    });
  }
}
```

**Prisma schema — tabela de auditoria:**
```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  action    String   // CREATE, READ, UPDATE, DELETE, LOGIN, EXPORT
  entity    String   // nome da entidade
  entityId  Int?
  details   String?  @db.Text
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

### Sessão e Timeout

```
- Portal do Cliente: sessão expira em 30 minutos de inatividade
- Admin: sessão expira em 15 minutos de inatividade
- Logout automático ao fechar o navegador (session cookie)
- Forçar re-login em operações críticas (aprovar desconto, deletar dados)
- Máximo 1 sessão ativa por usuário (opcional, configurável)
```

### Checklist de Segurança Pré-Deploy

- [ ] HTTPS habilitado em todos os domínios (Let's Encrypt)
- [ ] PostgreSQL sem porta exposta externamente
- [ ] JWT_SECRET com 256+ bits de entropia
- [ ] ENCRYPTION_KEY para campos LGPD gerada com crypto.randomBytes(32)
- [ ] Helmet configurado no NestJS
- [ ] CORS restrito aos domínios corretos
- [ ] Rate limiting ativo (global + login)
- [ ] Bcrypt com salt rounds >= 12
- [ ] Audit log implementado para operações sensíveis
- [ ] .env.example sem valores reais no repositório
- [ ] Backup automático do PostgreSQL configurado
- [ ] Headers de segurança verificados (securityheaders.com)
- [ ] Dependency audit: `npm audit` sem vulnerabilidades críticas

---

## Checklist Pré-Deploy

- [ ] Criar registros DNS no Cloudflare (3 subdomínios)
- [ ] Criar PostgreSQL no Coolify
- [ ] Fazer split do `apps/web` atual em `web-cliente` e `web-admin`
- [ ] Criar os 3 Dockerfiles
- [ ] Atualizar o `turbo.json` com os novos apps
- [ ] Configurar variáveis de ambiente no Coolify
- [ ] Primeiro deploy: API → rodar migrations → depois os frontends
- [ ] Testar SSL em todos os domínios
- [ ] Seed de clientes reais (CSV que o Fernando forneceu)
- [ ] Seed de serviços (planilha de correção)

---

## Próximos Passos

Na próxima conversa, vamos:
1. Fazer o split do `apps/web` em `web-cliente` e `web-admin`
2. Criar os Dockerfiles reais no repo
3. Atualizar o Prisma schema com todos os 11 módulos
4. Implementar as telas prototipadas no Next.js real
5. Configurar e deploy no Coolify

**Protótipos criados nesta sessão:** 12 telas interativas
- M01 Cadastro Rápido, M02 Pedido (2 modos), M03 Recebimento, M04 OS,
  M06 Etiquetas, M07 Qualidade, M08 Comercial CRM, M09 Financeiro,
  M10 Relatórios, M11 Dashboard, Login Portal, Login Admin
