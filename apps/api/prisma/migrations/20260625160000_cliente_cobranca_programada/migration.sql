-- Cobrança programada por cliente (Cora). Default desligada (emissão manual).
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "cobrancaAutomatica" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "diaCobranca" INTEGER;
