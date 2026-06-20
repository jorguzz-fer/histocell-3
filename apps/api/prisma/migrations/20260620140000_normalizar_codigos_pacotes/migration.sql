-- Normaliza códigos de pacotes legados (puramente numéricos) para o namespace
-- exclusivo PCT-NNN, eliminando a colisão com códigos de serviço (ex.: 943).
--
-- Idempotente e seguro:
--  • pacotes já prefixados (PCT-*) ou com código não-numérico são preservados;
--  • continua a numeração após o maior PCT-NNN existente;
--  • pacotes NÃO são referenciados por pedidos (itens guardam servicoId), então
--    mudar o código não quebra nada;
--  • se não houver pacote de código numérico, não faz nada.
WITH base AS (
  SELECT COALESCE(MAX((regexp_replace(codigo, '\D', '', 'g'))::int), 0) AS maxn
  FROM "Pacote"
  WHERE codigo ~ '^PCT-[0-9]+$'
),
alvo AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn
  FROM "Pacote"
  WHERE codigo ~ '^[0-9]+$'
)
UPDATE "Pacote" p
SET codigo = 'PCT-' || lpad((b.maxn + a.rn)::text, 3, '0')
FROM alvo a, base b
WHERE p.id = a.id;
