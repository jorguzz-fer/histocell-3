-- A Ordem de Serviço passa a poder nascer na Entrada, quando o material chega:
-- sem amostra ainda, ligada ao cliente e aos volumes recebidos. É nela que se
-- decide o serviço a executar. Idempotente.

-- ── Recipiente: seco/molhado + a OS que o recebeu ────────────────────────────
-- 'molhado' (pote com formol) vai para a Macroscopia; 'seco' (cassete, bloco,
-- lâmina) já vem preparado e segue direto para a Microtomia.
ALTER TABLE "Recipiente" ADD COLUMN IF NOT EXISTS "condicao" TEXT;
ALTER TABLE "Recipiente" ADD COLUMN IF NOT EXISTS "ordemServicoId" INTEGER;

-- ── OrdemServico: origem, cliente e amostra opcional ─────────────────────────
ALTER TABLE "OrdemServico" ADD COLUMN IF NOT EXISTS "origem" TEXT NOT NULL DEFAULT 'amostra';
ALTER TABLE "OrdemServico" ADD COLUMN IF NOT EXISTS "clienteId" INTEGER;
ALTER TABLE "OrdemServico" ALTER COLUMN "amostraId" DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Recipiente" ADD CONSTRAINT "Recipiente_ordemServicoId_fkey"
    FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Recipiente_ordemServicoId_idx" ON "Recipiente"("ordemServicoId");
CREATE INDEX IF NOT EXISTS "OrdemServico_clienteId_idx"    ON "OrdemServico"("clienteId");
CREATE INDEX IF NOT EXISTS "OrdemServico_origem_idx"       ON "OrdemServico"("origem");

-- Toda OS tem um dono: amostra (fluxo antigo) ou cliente (nascida na entrada).
DO $$ BEGIN
  ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_vinculo_check"
    CHECK ("amostraId" IS NOT NULL OR "clienteId" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Serviço efetivamente executado pela OS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "ItemOrdemServico" (
  "id"             SERIAL PRIMARY KEY,
  "ordemServicoId" INTEGER NOT NULL,
  "servicoId"      INTEGER NOT NULL,
  "quantidade"     INTEGER NOT NULL DEFAULT 1,
  "preco"          DECIMAL(10,2) NOT NULL,
  "desconto"       DECIMAL(5,2) NOT NULL DEFAULT 0,
  "observacoes"    TEXT
);

DO $$ BEGIN
  ALTER TABLE "ItemOrdemServico" ADD CONSTRAINT "ItemOrdemServico_ordemServicoId_fkey"
    FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ItemOrdemServico" ADD CONSTRAINT "ItemOrdemServico_servicoId_fkey"
    FOREIGN KEY ("servicoId") REFERENCES "Servico"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ItemOrdemServico_ordemServicoId_idx" ON "ItemOrdemServico"("ordemServicoId");
CREATE INDEX IF NOT EXISTS "ItemOrdemServico_servicoId_idx"      ON "ItemOrdemServico"("servicoId");
