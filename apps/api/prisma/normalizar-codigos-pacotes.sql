-- Normaliza códigos de pacotes para o namespace exclusivo PCT-NNN.
-- Só toca em pacotes cujo código é puramente numérico (ex.: "943"), que são
-- os que colidem com código de serviço. Pacotes já prefixados (PCT-*, ou
-- qualquer código não-numérico) são preservados.
--
-- Seguro: pacotes NÃO são referenciados por pedidos (itens guardam servicoId),
-- então renomear o código do pacote não quebra nada.
--
-- Rode no banco da API (container Postgres da API):
--   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f normalizar-codigos-pacotes.sql

BEGIN;

WITH base AS (
  -- maior número já usado no padrão PCT-NNN (0 se não houver)
  SELECT COALESCE(MAX((regexp_replace(codigo, '\D', '', 'g'))::int), 0) AS maxn
  FROM "Pacote"
  WHERE codigo ~ '^PCT-[0-9]+$'
),
alvo AS (
  -- pacotes de código puramente numérico, em ordem estável
  SELECT id, codigo AS codigo_antigo,
         row_number() OVER (ORDER BY id) AS rn
  FROM "Pacote"
  WHERE codigo ~ '^[0-9]+$'
)
UPDATE "Pacote" p
SET codigo = 'PCT-' || lpad((b.maxn + a.rn)::text, 3, '0')
FROM alvo a, base b
WHERE p.id = a.id;

-- conferência: lista o que ficou
SELECT id, codigo, nome FROM "Pacote" ORDER BY codigo;

COMMIT;
