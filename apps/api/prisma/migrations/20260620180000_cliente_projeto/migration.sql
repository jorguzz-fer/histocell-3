-- Projeto de financiamento (FAPESP/CNPq) do cliente pesquisador — sai na NF.
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "projeto" TEXT;
