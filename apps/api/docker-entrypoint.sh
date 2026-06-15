#!/bin/sh
set -e

# 1. Baseline / auto-recuperação: se o banco já tem as tabelas da app
#    (criadas por `prisma db push`) mas a 0_init não consta como aplicada com
#    sucesso, marca a 0_init como aplicada para o migrate deploy não tentar
#    recriar o que já existe. Cobre tanto o legado sem histórico quanto um
#    deploy anterior que deixou a 0_init em estado "failed" (P3009).
NEEDS_BASELINE="$(node scripts/needs-baseline.js)"
if [ "$NEEDS_BASELINE" = "1" ]; then
  echo "→ Schema legado detectado: baselinando 0_init como aplicada…"
  # Limpa eventual estado "failed" de uma tentativa anterior; ignora erro
  # quando não há nada a reverter (registro ausente ou já aplicado).
  npx prisma migrate resolve --rolled-back 0_init 2>/dev/null || true
  npx prisma migrate resolve --applied 0_init
fi

# 2. Aplica as migrations pendentes (em banco vazio cria tudo do zero).
npx prisma migrate deploy

# 3. Seed idempotente + start da API.
node dist/prisma/seed.js
exec node dist/src/main.js
