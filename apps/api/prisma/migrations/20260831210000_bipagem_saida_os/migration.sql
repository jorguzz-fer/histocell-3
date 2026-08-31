-- Bipagem de saída: a OS só conclui quando o código dela é bipado na
-- conferência — o carimbo final de entrega, cobrindo serviços sem etiqueta.
ALTER TABLE "OrdemServico" ADD COLUMN "saidaConferidaEm" TIMESTAMP(3);
ALTER TABLE "OrdemServico" ADD COLUMN "saidaConferidaPor" TEXT;
