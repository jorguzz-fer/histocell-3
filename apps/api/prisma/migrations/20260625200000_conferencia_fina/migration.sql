-- Conferência fina (bipagem das lâminas antes da expedição) + trava da OS.
ALTER TABLE "Etiqueta" ADD COLUMN IF NOT EXISTS "conferidaEm" TIMESTAMP(3);
ALTER TABLE "Etiqueta" ADD COLUMN IF NOT EXISTS "conferidaPor" TEXT;

ALTER TABLE "OrdemServico" ADD COLUMN IF NOT EXISTS "conferenciaLiberada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrdemServico" ADD COLUMN IF NOT EXISTS "conferenciaObs" TEXT;
