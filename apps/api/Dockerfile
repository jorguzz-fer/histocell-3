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
COPY . .
# Gera o Prisma Client ANTES do build: o nest build (tsc) precisa dos tipos
# gerados (ex.: $queryRawUnsafe<T>), senão falha com TS2347.
RUN cd apps/api && npx prisma generate
RUN npx turbo run build --filter=@histocell/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# curl é usado pela healthcheck do Coolify (GET /health). A imagem node:20-alpine
# não traz curl, então a healthcheck falhava com "curl: not found".
RUN apk add --no-cache curl
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/scripts ./scripts
COPY --from=builder /app/apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
CMD ["sh", "./docker-entrypoint.sh"]
