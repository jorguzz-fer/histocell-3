-- Uma fatura por cliente/mês: evita boleto duplicado em corrida (2 cliques / 2 réplicas).
-- Idempotente. (A cobrança Cora ainda não está em produção, então não há duplicatas a limpar.)
CREATE UNIQUE INDEX IF NOT EXISTS "Fatura_clienteId_periodo_key" ON "Fatura"("clienteId", "periodo");
