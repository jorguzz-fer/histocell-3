-- Pacote: modo de preço (fixo | desconto) e desconto por item (modo desconto)
ALTER TABLE "Pacote" ADD COLUMN IF NOT EXISTS "tipoPreco" TEXT NOT NULL DEFAULT 'fixo';
ALTER TABLE "PacoteItem" ADD COLUMN IF NOT EXISTS "descontoPct" DECIMAL(5,2) NOT NULL DEFAULT 0;
