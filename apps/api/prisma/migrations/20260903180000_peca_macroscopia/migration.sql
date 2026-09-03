-- Ficha de Macroscopia (reunião 02/09): peças descritas pela macroscopista, que
-- viram cassetes e cobrança ao concluir a etapa.
CREATE TABLE "PecaMacroscopia" (
  "id" SERIAL NOT NULL,
  "ordemServicoId" INTEGER NOT NULL,
  "recipienteId" INTEGER,
  "paciente" TEXT,
  "descricao" TEXT NOT NULL,
  "medidas" TEXT,
  "caracteristicas" TEXT,
  "cor" TEXT,
  "consistencia" TEXT,
  "observacoes" TEXT,
  "numeroCassetes" INTEGER NOT NULL DEFAULT 1,
  "servicoId" INTEGER,
  "servicoCodigo" TEXT,
  "servicoNome" TEXT,
  "coloracao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PecaMacroscopia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PecaMacroscopia_ordemServicoId_idx" ON "PecaMacroscopia"("ordemServicoId");
ALTER TABLE "PecaMacroscopia" ADD CONSTRAINT "PecaMacroscopia_ordemServicoId_fkey"
  FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
