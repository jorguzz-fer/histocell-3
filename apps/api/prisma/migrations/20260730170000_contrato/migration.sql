-- Contrato de mensalidade fixa (recorrente). Idempotente.
CREATE TABLE IF NOT EXISTS "Contrato" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "valorMensal" DECIMAL(10,2) NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "duracaoMeses" INTEGER NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "diaCobranca" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "ultimaCobrancaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Contrato_clienteId_idx" ON "Contrato"("clienteId");
CREATE INDEX IF NOT EXISTS "Contrato_ativo_idx" ON "Contrato"("ativo");
CREATE INDEX IF NOT EXISTS "Contrato_dataFim_idx" ON "Contrato"("dataFim");

DO $$ BEGIN
  ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
