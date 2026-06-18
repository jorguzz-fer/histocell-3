-- Flags do pedido (E5): prioridade e pagamento adiantado.

ALTER TABLE "Pedido" ADD COLUMN "urgente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pedido" ADD COLUMN "pagamentoAdiantado" BOOLEAN NOT NULL DEFAULT false;
