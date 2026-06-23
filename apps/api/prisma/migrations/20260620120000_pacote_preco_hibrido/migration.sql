-- Pacote: modo de preço (fixo | desconto) e desconto por item (modo desconto)
ALTER TABLE "Pacote" ADD COLUMN "tipoPreco" TEXT NOT NULL DEFAULT 'fixo';
ALTER TABLE "PacoteItem" ADD COLUMN "descontoPct" DECIMAL(5,2) NOT NULL DEFAULT 0;
