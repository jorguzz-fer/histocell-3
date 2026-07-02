-- Conferência de recebimento (E4): previsto x recebido + flag de excedente.

ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "qtdPrevista" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "qtdRecebida" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "excedente" BOOLEAN NOT NULL DEFAULT false;
