-- Vincula a amostra/cassete ao serviço solicitado (macroscopia: pote → N
-- cassetes, cada um com seu serviço). Idempotente.
ALTER TABLE "Amostra" ADD COLUMN IF NOT EXISTS "servicoId" INTEGER;

CREATE INDEX IF NOT EXISTS "Amostra_servicoId_idx" ON "Amostra"("servicoId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Amostra_servicoId_fkey') THEN
    ALTER TABLE "Amostra" ADD CONSTRAINT "Amostra_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
