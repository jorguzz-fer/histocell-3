-- Arquivamento de orçamento (não virou pedido): especulador, desistiu, recusado.
-- Idempotente.
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "motivoArquivo" TEXT;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "dataArquivo" TIMESTAMP(3);
