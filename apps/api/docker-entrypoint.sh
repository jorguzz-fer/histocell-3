#!/bin/sh
set -e

# 1. Baseline automático (uma única vez): se o banco já tem tabelas da app
#    (criadas por `prisma db push`) mas não tem histórico de migrations,
#    marca a migration 0_init como já aplicada para o migrate deploy não
#    tentar recriar o que já existe.
NEEDS_BASELINE="$(node scripts/needs-baseline.js)"
if [ "$NEEDS_BASELINE" = "1" ]; then
  echo "→ Banco existente sem histórico de migrations: baselinando 0_init…"
  npx prisma migrate resolve --applied 0_init
fi

# 2. Aplica as migrations pendentes (em banco vazio cria tudo do zero).
npx prisma migrate deploy

# 3. Seed idempotente + start da API.
node dist/prisma/seed.js
exec node dist/src/main.js
