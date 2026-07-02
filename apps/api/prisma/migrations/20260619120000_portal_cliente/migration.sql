-- Portal do cliente (sem login): token por cliente + origem do pedido.

ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "portalToken" TEXT;
UPDATE "Cliente" SET "portalToken" = replace(gen_random_uuid()::text, '-', '') WHERE "portalToken" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Cliente_portalToken_key" ON "Cliente"("portalToken");

ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "origem" TEXT NOT NULL DEFAULT 'local';
