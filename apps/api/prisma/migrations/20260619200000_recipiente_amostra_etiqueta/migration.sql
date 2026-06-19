-- Etiqueta em 2 níveis (3ª homologação Célio):
-- nível 1 = etiqueta do recipiente na Recepção; nível 2 = amostras designadas por recipiente.

ALTER TABLE "Recipiente" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
ALTER TABLE "Recipiente" ADD COLUMN IF NOT EXISTS "etiquetaImpressa" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "Recipiente_codigo_key" ON "Recipiente"("codigo");

ALTER TABLE "Amostra" ADD COLUMN IF NOT EXISTS "recipienteId" INTEGER;
CREATE INDEX IF NOT EXISTS "Amostra_recipienteId_idx" ON "Amostra"("recipienteId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Amostra_recipienteId_fkey'
  ) THEN
    ALTER TABLE "Amostra"
      ADD CONSTRAINT "Amostra_recipienteId_fkey"
      FOREIGN KEY ("recipienteId") REFERENCES "Recipiente"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
