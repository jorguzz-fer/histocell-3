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
RUN npx turbo run build --filter=@histocell/web-cliente

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
