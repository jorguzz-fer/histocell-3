#!/bin/sh
set -e

# Baseline da 0_init: ela é um snapshot do schema que JÁ existe em produção
# (criado pelos antigos `prisma db push`), então nunca deve ser EXECUTADA
# contra esse banco — apenas marcada como aplicada. Sem isso, o migrate deploy
# tenta recriar tabelas existentes e trava (P3009).

baseline_0init() {
  # Limpa eventual estado "failed" de uma tentativa anterior (ignora erro se
  # não houver nada a reverter) e marca a 0_init como aplicada.
  npx prisma migrate resolve --rolled-back 0_init 2>/dev/null || true
  npx prisma migrate resolve --applied 0_init
}

# 1. Baseline proativo via detecção (legado sem histórico ou 0_init não-aplicada).
NEEDS_BASELINE="$(node scripts/needs-baseline.js 2>/dev/null || echo 0)"
if [ "$NEEDS_BASELINE" = "1" ]; then
  echo "→ Schema legado/0_init não-aplicada: baselinando 0_init…"
  baseline_0init
fi

# 2. Aplica as migrations. Se ainda assim falhar (ex.: a detecção não rodou),
#    recupera o baseline pelo exit-code e tenta de novo — sem depender de script.
if ! npx prisma migrate deploy; then
  echo "→ migrate deploy falhou; recuperando baseline da 0_init e re-tentando…"
  baseline_0init
  npx prisma migrate deploy
fi

# 3. Seed idempotente + start da API.
node dist/prisma/seed.js
exec node dist/src/main.js
