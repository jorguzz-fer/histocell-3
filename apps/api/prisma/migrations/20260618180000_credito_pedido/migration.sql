-- Abatimento automático de crédito por pedido (E6): vincula o débito ao pedido.

ALTER TABLE "CreditoPrePago" ADD COLUMN IF NOT EXISTS "pedidoId" INTEGER;
CREATE INDEX IF NOT EXISTS "CreditoPrePago_pedidoId_idx" ON "CreditoPrePago"("pedidoId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreditoPrePago_pedidoId_fkey') THEN
    ALTER TABLE "CreditoPrePago"
      ADD CONSTRAINT "CreditoPrePago_pedidoId_fkey"
      FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
