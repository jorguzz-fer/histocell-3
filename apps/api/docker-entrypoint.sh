#!/bin/sh
set -e

# Baseline da 0_init: ela é um snapshot do schema que JÁ existe em produção
# (criado pelos antigos `prisma db push`), então nunca deve ser EXECUTADA
# contra esse banco — apenas marcada como aplicada. Sem isso, o migrate deploy
# tenta recriar tabelas existentes e trava (P3009).

baseline_0init() {
  # Limpa eventual estado "failed" de uma tentativa anterior (ignora erro se
  # não houver nada a reverter) e marca a 0_init como aplicada. O `|| true` na
  # segunda linha evita abortar (set -e) com P3008 quando já está aplicada.
  npx prisma migrate resolve --rolled-back 0_init 2>/dev/null || true
  npx prisma migrate resolve --applied 0_init 2>/dev/null || true
}

# 1. Baseline proativo via detecção (legado sem histórico ou 0_init não-aplicada).
NEEDS_BASELINE="$(node scripts/needs-baseline.js 2>/dev/null || echo 0)"
if [ "$NEEDS_BASELINE" = "1" ]; then
  echo "→ Schema legado/0_init não-aplicada: baselinando 0_init…"
  baseline_0init
fi

# 2. Limpa migrations presas em estado "failed" (ex.: um ADD COLUMN que já
#    existia num deploy anterior). Os arquivos de migration são idempotentes
#    (IF NOT EXISTS), então re-rodá-los é seguro. Sem isso, o migrate deploy
#    aborta com P3009 para sempre.
node scripts/resolve-failed.js || true

# 3. Aplica as migrations. Se ainda assim falhar, recupera baseline + failed
#    pelo exit-code e tenta de novo — sem depender da detecção.
if ! npx prisma migrate deploy; then
  echo "→ migrate deploy falhou; recuperando baseline/failed e re-tentando…"
  baseline_0init
  node scripts/resolve-failed.js || true
  npx prisma migrate deploy
fi

# 4. Seed idempotente + start da API.
node dist/prisma/seed.js
exec node dist/src/main.js
