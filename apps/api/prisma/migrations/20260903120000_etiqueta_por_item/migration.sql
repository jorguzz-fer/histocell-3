-- A etiqueta gerada na OS passa a lembrar de qual item de serviço saiu: é o
-- que permite mostrar ao técnico "H1 · 001 HE" na tela, na etiqueta e na OS
-- impressa (pedido do Célio, reunião de 02/09).
ALTER TABLE "Etiqueta" ADD COLUMN "itemOrdemServicoId" INTEGER;
ALTER TABLE "Etiqueta" ADD CONSTRAINT "Etiqueta_itemOrdemServicoId_fkey"
  FOREIGN KEY ("itemOrdemServicoId") REFERENCES "ItemOrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Etiqueta_itemOrdemServicoId_idx" ON "Etiqueta"("itemOrdemServicoId");
