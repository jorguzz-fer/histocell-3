-- Flags do pedido (E5): prioridade e pagamento adiantado.

ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "urgente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "pagamentoAdiantado" BOOLEAN NOT NULL DEFAULT false;
