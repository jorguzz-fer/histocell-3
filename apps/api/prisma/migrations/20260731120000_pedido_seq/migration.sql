-- Código curto sequencial do pedido (exibição): Pedido.seq. Idempotente.
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "seq" INTEGER;

-- Backfill: numera os pedidos existentes (que ainda não têm seq) por ordem de
-- criação/id, sem colidir com valores já atribuídos.
WITH base AS (
  SELECT COALESCE(MAX("seq"), 0) AS maxseq FROM "Pedido"
),
ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") AS rn
  FROM "Pedido"
  WHERE "seq" IS NULL
)
UPDATE "Pedido" p
SET "seq" = base.maxseq + ranked.rn
FROM ranked, base
WHERE p."id" = ranked."id";

CREATE UNIQUE INDEX IF NOT EXISTS "Pedido_seq_key" ON "Pedido"("seq");
