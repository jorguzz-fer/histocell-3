-- Etiquetas de cassete geradas direto na OS (fluxo da Entrada): a etiqueta
-- passa a pertencer a uma amostra OU à própria OS — nunca a nenhuma das duas.
ALTER TABLE "Etiqueta" ALTER COLUMN "amostraId" DROP NOT NULL;
ALTER TABLE "Etiqueta" ADD COLUMN "ordemServicoId" INTEGER;
ALTER TABLE "Etiqueta" ADD CONSTRAINT "Etiqueta_ordemServicoId_fkey"
  FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Etiqueta_ordemServicoId_idx" ON "Etiqueta"("ordemServicoId");
ALTER TABLE "Etiqueta" ADD CONSTRAINT "Etiqueta_vinculo_check"
  CHECK ("amostraId" IS NOT NULL OR "ordemServicoId" IS NOT NULL);
