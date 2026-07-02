-- Responsável pelo último scan (mostrado no rastreio).
ALTER TABLE "Etiqueta" ADD COLUMN IF NOT EXISTS "ultimoResponsavel" TEXT;
