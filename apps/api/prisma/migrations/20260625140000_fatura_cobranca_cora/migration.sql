-- Campos da integração de cobrança (Banco Cora) na Fatura. Aditivo e idempotente.
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "coraInvoiceId" TEXT;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "coraStatus" TEXT;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "linhaDigitavel" TEXT;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "codigoBarras" TEXT;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "pixQrCode" TEXT;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "nfseStatus" TEXT;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "nfseUrl" TEXT;
ALTER TABLE "Fatura" ADD COLUMN IF NOT EXISTS "erroCobranca" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Fatura_coraInvoiceId_key" ON "Fatura"("coraInvoiceId");
