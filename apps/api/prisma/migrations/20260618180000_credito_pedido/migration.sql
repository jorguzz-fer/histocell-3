-- Abatimento automático de crédito por pedido (E6): vincula o débito ao pedido.

ALTER TABLE "CreditoPrePago" ADD COLUMN "pedidoId" INTEGER;
CREATE INDEX "CreditoPrePago_pedidoId_idx" ON "CreditoPrePago"("pedidoId");
ALTER TABLE "CreditoPrePago"
  ADD CONSTRAINT "CreditoPrePago_pedidoId_fkey"
  FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
