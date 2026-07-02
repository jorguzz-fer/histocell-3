-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "descontoPadrao" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Pacote" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pacote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PacoteItem" (
    "id" SERIAL NOT NULL,
    "pacoteId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PacoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Pacote_codigo_key" ON "Pacote"("codigo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Pacote_codigo_idx" ON "Pacote"("codigo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Pacote_ativo_idx" ON "Pacote"("ativo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PacoteItem_pacoteId_idx" ON "PacoteItem"("pacoteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PacoteItem_servicoId_idx" ON "PacoteItem"("servicoId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PacoteItem_pacoteId_fkey') THEN
    ALTER TABLE "PacoteItem" ADD CONSTRAINT "PacoteItem_pacoteId_fkey" FOREIGN KEY ("pacoteId") REFERENCES "Pacote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PacoteItem_servicoId_fkey') THEN
    ALTER TABLE "PacoteItem" ADD CONSTRAINT "PacoteItem_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
