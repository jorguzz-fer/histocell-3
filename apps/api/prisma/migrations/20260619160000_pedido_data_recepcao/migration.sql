-- Horário da entrada na recepção (etapa 1) — para relatório de tempos do fluxo.
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "dataRecepcao" TIMESTAMP(3);
