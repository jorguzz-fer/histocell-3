-- Prazo de entrega: padrão por serviço (dias úteis) + acordado no pedido/orçamento.
ALTER TABLE "Servico" ADD COLUMN IF NOT EXISTS "prazoDias" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "prazoDias" INTEGER;
