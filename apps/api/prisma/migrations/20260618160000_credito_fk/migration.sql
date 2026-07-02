-- Crédito pré-pago (E6): vincula CreditoPrePago ao Cliente (FK).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreditoPrePago_clienteId_fkey') THEN
    ALTER TABLE "CreditoPrePago"
      ADD CONSTRAINT "CreditoPrePago_clienteId_fkey"
      FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
