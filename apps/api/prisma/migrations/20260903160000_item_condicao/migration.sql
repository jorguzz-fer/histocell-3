-- Condição por item de serviço da OS e carimbo de encaminhamento à técnica
-- (reunião 02/09: seco e molhado "cada um no seu quadrado" na mesma OS).
ALTER TABLE "ItemOrdemServico" ADD COLUMN "condicao" TEXT;
ALTER TABLE "ItemOrdemServico" ADD COLUMN "encaminhadoEm" TIMESTAMP(3);
ALTER TABLE "ItemOrdemServico" ADD COLUMN "encaminhadoPor" TEXT;
