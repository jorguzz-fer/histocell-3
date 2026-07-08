-- Papéis de acesso customizáveis + matriz de permissões por área.
-- Idempotente (IF NOT EXISTS) para conviver com bancos criados por db-push.

CREATE TABLE IF NOT EXISTS "Papel" (
  "id"        SERIAL PRIMARY KEY,
  "nome"      TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "descricao" TEXT,
  "sistema"   BOOLEAN NOT NULL DEFAULT false,
  "ativo"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Papel_nome_key" ON "Papel"("nome");
CREATE INDEX IF NOT EXISTS "Papel_nome_idx" ON "Papel"("nome");

CREATE TABLE IF NOT EXISTS "PapelPermissao" (
  "id"      SERIAL PRIMARY KEY,
  "papelId" INTEGER NOT NULL,
  "chave"   TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "PapelPermissao_papelId_chave_key" ON "PapelPermissao"("papelId", "chave");
CREATE INDEX IF NOT EXISTS "PapelPermissao_papelId_idx" ON "PapelPermissao"("papelId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PapelPermissao_papelId_fkey'
  ) THEN
    ALTER TABLE "PapelPermissao"
      ADD CONSTRAINT "PapelPermissao_papelId_fkey"
      FOREIGN KEY ("papelId") REFERENCES "Papel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
