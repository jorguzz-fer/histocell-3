-- Crédito pré-pago (E6): vincula CreditoPrePago ao Cliente (FK).

ALTER TABLE "CreditoPrePago"
  ADD CONSTRAINT "CreditoPrePago_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
