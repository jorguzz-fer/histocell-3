-- Emissão de etiquetas a partir do pedido: vincula a amostra ao item de origem.
-- Permite criar uma amostra por item do pedido de forma idempotente (1:1).

-- AlterTable
ALTER TABLE "Amostra" ADD COLUMN IF NOT EXISTS "itemPedidoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Amostra_itemPedidoId_key" ON "Amostra"("itemPedidoId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Amostra_itemPedidoId_fkey') THEN
    ALTER TABLE "Amostra" ADD CONSTRAINT "Amostra_itemPedidoId_fkey" FOREIGN KEY ("itemPedidoId") REFERENCES "ItemPedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
