-- Rastreio por departamento (scan de código de barras): entrada/saída de cada
-- etiqueta (lâmina/cassete) ao longo do fluxo do laboratório.

-- AlterTable
ALTER TABLE "Etiqueta" ADD COLUMN "departamentoAtual" TEXT;
ALTER TABLE "Etiqueta" ADD COLUMN "rastreioStatus" TEXT NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE "Etiqueta" ADD COLUMN "ultimoEventoEm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Etiqueta_departamentoAtual_idx" ON "Etiqueta"("departamentoAtual");

-- CreateTable
CREATE TABLE "RastreioEvento" (
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
CREATE INDEX "RastreioEvento_etiquetaId_idx" ON "RastreioEvento"("etiquetaId");
CREATE INDEX "RastreioEvento_departamento_idx" ON "RastreioEvento"("departamento");
CREATE INDEX "RastreioEvento_createdAt_idx" ON "RastreioEvento"("createdAt");

-- AddForeignKey
ALTER TABLE "RastreioEvento" ADD CONSTRAINT "RastreioEvento_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
