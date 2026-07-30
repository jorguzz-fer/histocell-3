-- Múltiplos e-mails de cobrança por cliente. Idempotente.
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "emailsCobranca" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
