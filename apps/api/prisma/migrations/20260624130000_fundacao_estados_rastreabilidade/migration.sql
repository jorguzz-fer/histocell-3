-- Migration que faltou ser criada quando o Spec 1A (Fundação) foi mergeado.
-- Adiciona os campos novos usados pelo gate de aprovação de divergência,
-- pela flag de etiqueta automática e pela FK de responsável (User).
--
-- Todos os ALTERs são aditivos e idempotentes via IF NOT EXISTS — seguros para
-- aplicar em produção sem nenhuma perda de dado.

-- 1) Servico.geraEtiqueta
ALTER TABLE "Servico" ADD COLUMN IF NOT EXISTS "geraEtiqueta" BOOLEAN NOT NULL DEFAULT false;

-- 2) Pedido.contagemDivergente
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "contagemDivergente" BOOLEAN NOT NULL DEFAULT false;

-- 3) OrdemServico.responsavelUserId (FK opcional para User)
ALTER TABLE "OrdemServico" ADD COLUMN IF NOT EXISTS "responsavelUserId" INTEGER;
CREATE INDEX IF NOT EXISTS "OrdemServico_responsavelUserId_idx" ON "OrdemServico"("responsavelUserId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'OrdemServico_responsavelUserId_fkey'
      AND table_name = 'OrdemServico'
  ) THEN
    ALTER TABLE "OrdemServico"
      ADD CONSTRAINT "OrdemServico_responsavelUserId_fkey"
      FOREIGN KEY ("responsavelUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) EtapaOS.responsavelUserId (FK opcional para User)
ALTER TABLE "EtapaOS" ADD COLUMN IF NOT EXISTS "responsavelUserId" INTEGER;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'EtapaOS_responsavelUserId_fkey'
      AND table_name = 'EtapaOS'
  ) THEN
    ALTER TABLE "EtapaOS"
      ADD CONSTRAINT "EtapaOS_responsavelUserId_fkey"
      FOREIGN KEY ("responsavelUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
