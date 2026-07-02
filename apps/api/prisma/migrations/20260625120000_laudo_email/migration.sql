-- Laudo "por e-mail": liga ao pedido, guarda patologista + PDF (base64) + status.
-- Aditivo e idempotente.

-- ordemServicoId passa a ser opcional (laudo pode ligar direto ao pedido)
ALTER TABLE "Laudo" ALTER COLUMN "ordemServicoId" DROP NOT NULL;
ALTER TABLE "Laudo" ALTER COLUMN "conteudo" DROP NOT NULL;

ALTER TABLE "Laudo" ADD COLUMN IF NOT EXISTS "pedidoId" INTEGER;
ALTER TABLE "Laudo" ADD COLUMN IF NOT EXISTS "patologistaNome" TEXT;
ALTER TABLE "Laudo" ADD COLUMN IF NOT EXISTS "patologistaEmail" TEXT;
ALTER TABLE "Laudo" ADD COLUMN IF NOT EXISTS "arquivoBase64" TEXT;
ALTER TABLE "Laudo" ADD COLUMN IF NOT EXISTS "arquivoNome" TEXT;
ALTER TABLE "Laudo" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'solicitado';
ALTER TABLE "Laudo" ADD COLUMN IF NOT EXISTS "solicitadoPor" TEXT;
ALTER TABLE "Laudo" ADD COLUMN IF NOT EXISTS "solicitadoEm" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Laudo_pedidoId_idx" ON "Laudo"("pedidoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Laudo_pedidoId_fkey'
  ) THEN
    ALTER TABLE "Laudo" ADD CONSTRAINT "Laudo_pedidoId_fkey"
      FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
