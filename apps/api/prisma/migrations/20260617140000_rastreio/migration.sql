-- Rastreio por departamento (scan de código de barras): entrada/saída de cada
-- etiqueta (lâmina/cassete) ao longo do fluxo do laboratório.

-- AlterTable
ALTER TABLE "Etiqueta" ADD COLUMN IF NOT EXISTS "departamentoAtual" TEXT;
ALTER TABLE "Etiqueta" ADD COLUMN IF NOT EXISTS "rastreioStatus" TEXT NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE "Etiqueta" ADD COLUMN IF NOT EXISTS "ultimoEventoEm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Etiqueta_departamentoAtual_idx" ON "Etiqueta"("departamentoAtual");

-- CreateTable
CREATE TABLE IF NOT EXISTS "RastreioEvento" (
    "id" SERIAL NOT NULL,
    "etiquetaId" INTEGER NOT NULL,
    "departamento" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "scannedPor" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RastreioEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RastreioEvento_etiquetaId_idx" ON "RastreioEvento"("etiquetaId");
CREATE INDEX IF NOT EXISTS "RastreioEvento_departamento_idx" ON "RastreioEvento"("departamento");
CREATE INDEX IF NOT EXISTS "RastreioEvento_createdAt_idx" ON "RastreioEvento"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RastreioEvento_etiquetaId_fkey') THEN
    ALTER TABLE "RastreioEvento" ADD CONSTRAINT "RastreioEvento_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
