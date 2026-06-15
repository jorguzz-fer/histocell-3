-- Etiquetas (M06): campos do modelo real de etiqueta de lâmina/cassete.
-- A tabela "Etiqueta" nasce vazia (módulo era stub), então a coluna
-- obrigatória "numero" pode ser adicionada como NOT NULL diretamente.

-- AlterTable
ALTER TABLE "Etiqueta" ADD COLUMN     "numero" INTEGER NOT NULL;
ALTER TABLE "Etiqueta" ADD COLUMN     "coloracao" TEXT;
ALTER TABLE "Etiqueta" ADD COLUMN     "identificacao" TEXT;
ALTER TABLE "Etiqueta" ADD COLUMN     "laminaSeq" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Etiqueta" ADD COLUMN     "impressoEm" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_numero_key" ON "Etiqueta"("numero");

-- CreateIndex
CREATE INDEX "Etiqueta_numero_idx" ON "Etiqueta"("numero");

-- CreateIndex
CREATE INDEX "Etiqueta_impresso_idx" ON "Etiqueta"("impresso");

-- Sequência global do número da etiqueta (ex: 1384126). Para continuar a
-- numeração física atual, ajuste o início com:
--   ALTER SEQUENCE "histocell_etiqueta_numero_seq" RESTART WITH <base>;
CREATE SEQUENCE IF NOT EXISTS "histocell_etiqueta_numero_seq" START 1;

-- Sequência contínua do número interno Histocell da amostra (não reinicia
-- por dia — ex: 00045). Ajuste o início, se necessário, com:
--   ALTER SEQUENCE "histocell_amostra_numero_seq" RESTART WITH <base>;
CREATE SEQUENCE IF NOT EXISTS "histocell_amostra_numero_seq" START 1;
