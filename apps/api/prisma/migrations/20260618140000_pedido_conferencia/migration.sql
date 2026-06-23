-- Conferência de recebimento (E4): previsto x recebido + flag de excedente.

ALTER TABLE "Pedido" ADD COLUMN "qtdPrevista" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN "qtdRecebida" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN "excedente" BOOLEAN NOT NULL DEFAULT false;
