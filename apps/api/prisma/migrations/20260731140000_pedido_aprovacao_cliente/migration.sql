-- Trilha de aprovação do orçamento (Onda 4): orçamento = Pedido pré-aprovação.
-- Idempotente. Pedidos existentes ficam "dispensado" (fluxo normal, sem aprovação).
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "aprovacaoCliente" TEXT NOT NULL DEFAULT 'dispensado';
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "aprovadoClienteEm" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Pedido_aprovacaoCliente_idx" ON "Pedido"("aprovacaoCliente");
