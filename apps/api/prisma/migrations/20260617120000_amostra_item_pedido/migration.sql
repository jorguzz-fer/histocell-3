-- Emissão de etiquetas a partir do pedido: vincula a amostra ao item de origem.
-- Permite criar uma amostra por item do pedido de forma idempotente (1:1).

-- AlterTable
ALTER TABLE "Amostra" ADD COLUMN "itemPedidoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Amostra_itemPedidoId_key" ON "Amostra"("itemPedidoId");

-- AddForeignKey
ALTER TABLE "Amostra" ADD CONSTRAINT "Amostra_itemPedidoId_fkey" FOREIGN KEY ("itemPedidoId") REFERENCES "ItemPedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
