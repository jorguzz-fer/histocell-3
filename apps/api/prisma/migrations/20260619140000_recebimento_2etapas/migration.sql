-- Recebimento em 2 etapas (Recepção → Laboratório): tipos de recipiente + recipientes recebidos.

CREATE TABLE IF NOT EXISTS "TipoRecipiente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TipoRecipiente_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TipoRecipiente_nome_key" ON "TipoRecipiente"("nome");

INSERT INTO "TipoRecipiente" ("nome","ordem") VALUES
  ('Pote',1),('Caixa',2),('Saco',3),('Outro',4)
ON CONFLICT ("nome") DO NOTHING;

CREATE TABLE IF NOT EXISTS "Recipiente" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "observacoes" TEXT,
    "recebidoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recipiente_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Recipiente_pedidoId_idx" ON "Recipiente"("pedidoId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Recipiente_pedidoId_fkey') THEN
    ALTER TABLE "Recipiente" ADD CONSTRAINT "Recipiente_pedidoId_fkey"
      FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
