# Histocell — Sistema de Gestão Laboratorial

Sistema de gestão para laboratório de anatomia patológica, desenvolvido para **Histocell Soluções em Anatomia Patológica Ltda**.

## Arquitetura

```
histocell-cliente.tudomudou.com.br  →  Next.js (Portal do Cliente)   :3000
histocell-admin.tudomudou.com.br    →  Next.js (Painel Admin)        :3002
api-histocell.tudomudou.com.br      →  NestJS (API)                  :3001
                                    →  PostgreSQL                     :5432
```

## Monorepo

- `apps/api` — NestJS + Prisma + JWT/RBAC
- `apps/web-admin` — Next.js (painel interno)
- `apps/web-cliente` — Next.js (portal do cliente)
- `packages/types` — Tipos TypeScript compartilhados

## Setup Local

```bash
# Subir banco
docker compose up -d db

# Instalar deps
npm install

# Rodar migrations + seed
cd apps/api
cp ../../.env.example .env  # ajustar DATABASE_URL
npx prisma migrate dev
npx prisma db seed
cd ../..

# Dev (todos os apps)
npm run dev
```

## Deploy (Coolify)

Ver `DEPLOY-GUIDE.md` para instruções completas.

## Stack

- **Backend:** NestJS, Prisma, PostgreSQL, JWT, bcrypt
- **Frontend:** Next.js 14, Tailwind CSS
- **Infra:** Coolify, Docker, Let's Encrypt
- **Segurança:** RBAC, LGPD, Helmet, rate limiting, audit log
