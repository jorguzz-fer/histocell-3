-- Entrada avulsa (tela Entrada): o material chega na recepção antes de existir
-- orçamento. O recipiente passa a poder nascer ligado só ao cliente; o pedido
-- entra depois, na vinculação. Idempotente.

ALTER TABLE "Recipiente" ALTER COLUMN "pedidoId" DROP NOT NULL;
ALTER TABLE "Recipiente" ADD COLUMN IF NOT EXISTS "clienteId" INTEGER;

DO $$ BEGIN
  ALTER TABLE "Recipiente" ADD CONSTRAINT "Recipiente_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Recipiente_clienteId_idx" ON "Recipiente"("clienteId");

-- Todo recipiente pertence a um pedido OU a um cliente (entrada avulsa). Sem
-- isso, um recipiente órfão ficaria invisível nas duas telas.
DO $$ BEGIN
  ALTER TABLE "Recipiente" ADD CONSTRAINT "Recipiente_vinculo_check"
    CHECK ("pedidoId" IS NOT NULL OR "clienteId" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Numeração da etiqueta de entrada (ENT-000001…). Global e contínua, como a de
-- etiqueta/amostra — não reinicia por dia.
CREATE SEQUENCE IF NOT EXISTS "histocell_entrada_numero_seq" START 1;
