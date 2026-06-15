-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "descontoPadrao" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Pacote" (
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
CREATE TABLE "PacoteItem" (
    "id" SERIAL NOT NULL,
    "pacoteId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PacoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pacote_codigo_key" ON "Pacote"("codigo");

-- CreateIndex
CREATE INDEX "Pacote_codigo_idx" ON "Pacote"("codigo");

-- CreateIndex
CREATE INDEX "Pacote_ativo_idx" ON "Pacote"("ativo");

-- CreateIndex
CREATE INDEX "PacoteItem_pacoteId_idx" ON "PacoteItem"("pacoteId");

-- CreateIndex
CREATE INDEX "PacoteItem_servicoId_idx" ON "PacoteItem"("servicoId");

-- AddForeignKey
ALTER TABLE "PacoteItem" ADD CONSTRAINT "PacoteItem_pacoteId_fkey" FOREIGN KEY ("pacoteId") REFERENCES "Pacote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacoteItem" ADD CONSTRAINT "PacoteItem_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

