-- Código curto sequencial da OS (exibição): OrdemServico.seq. Idempotente.
ALTER TABLE "OrdemServico" ADD COLUMN IF NOT EXISTS "seq" INTEGER;

-- Backfill: numera as OS existentes (sem seq) por ordem de id, sem colidir.
WITH base AS (
  SELECT COALESCE(MAX("seq"), 0) AS maxseq FROM "OrdemServico"
),
ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") AS rn
  FROM "OrdemServico"
  WHERE "seq" IS NULL
)
UPDATE "OrdemServico" o
SET "seq" = base.maxseq + ranked.rn
FROM ranked, base
WHERE o."id" = ranked."id";

CREATE UNIQUE INDEX IF NOT EXISTS "OrdemServico_seq_key" ON "OrdemServico"("seq");
