-- ============================================================================
-- Reset do piloto (SQL) — mantém o cliente AlchemyPet E todos os dados dele,
-- apaga tudo dos demais clientes (e os demais clientes).
--
-- Como rodar (no container do POSTGRES, não no da API):
--   psql -U histocell -d histocell -f reset-piloto.sql
-- ou cole este bloco inteiro no psql.
--
-- Seguro: aborta se o AlchemyPet não existir. Tudo num único bloco (atômico).
-- ⚠️ Faça backup/snapshot do banco antes de rodar — é irreversível.
-- ============================================================================
DO $$
DECLARE keep_id int;
BEGIN
  SELECT id INTO keep_id FROM "Cliente"
   WHERE nome ILIKE '%alchemypet%' OR "nomeFantasia" ILIKE '%alchemypet%'
      OR nome ILIKE '%alquimipet%' OR "nomeFantasia" ILIKE '%alquimipet%'
   ORDER BY id LIMIT 1;

  IF keep_id IS NULL THEN
    RAISE EXCEPTION 'AlchemyPet nao encontrado — abortando para nao zerar o banco sem cliente.';
  END IF;
  RAISE NOTICE 'Mantendo cliente #% (com todos os dados dele).', keep_id;

  -- Rastreio (tabela pode ainda nao existir em producao)
  IF to_regclass('"RastreioEvento"') IS NOT NULL THEN
    DELETE FROM "RastreioEvento" r USING "Etiqueta" e, "Amostra" a, "Pedido" p
     WHERE r."etiquetaId" = e.id AND e."amostraId" = a.id AND a."pedidoId" = p.id
       AND p."clienteId" <> keep_id;
  END IF;

  DELETE FROM "Etiqueta" e USING "Amostra" a, "Pedido" p
   WHERE e."amostraId" = a.id AND a."pedidoId" = p.id AND p."clienteId" <> keep_id;

  DELETE FROM "Laudo" l USING "OrdemServico" o, "Amostra" a, "Pedido" p
   WHERE l."ordemServicoId" = o.id AND o."amostraId" = a.id AND a."pedidoId" = p.id
     AND p."clienteId" <> keep_id;
  DELETE FROM "EtapaOS" et USING "OrdemServico" o, "Amostra" a, "Pedido" p
   WHERE et."ordemServicoId" = o.id AND o."amostraId" = a.id AND a."pedidoId" = p.id
     AND p."clienteId" <> keep_id;
  DELETE FROM "OrdemServico" o USING "Amostra" a, "Pedido" p
   WHERE o."amostraId" = a.id AND a."pedidoId" = p.id AND p."clienteId" <> keep_id;

  DELETE FROM "Amostra" a USING "Pedido" p
   WHERE a."pedidoId" = p.id AND p."clienteId" <> keep_id;
  DELETE FROM "CreditoPrePago" WHERE "clienteId" <> keep_id;
  DELETE FROM "ItemPedido" i USING "Pedido" p
   WHERE i."pedidoId" = p.id AND p."clienteId" <> keep_id;
  DELETE FROM "Pedido" WHERE "clienteId" <> keep_id;

  DELETE FROM "ItemFatura" i USING "Fatura" f
   WHERE i."faturaId" = f.id AND f."clienteId" <> keep_id;
  DELETE FROM "Fatura" WHERE "clienteId" <> keep_id;
  DELETE FROM "ItemOrcamento" i USING "Orcamento" o
   WHERE i."orcamentoId" = o.id AND o."clienteId" <> keep_id;
  DELETE FROM "Orcamento" WHERE "clienteId" <> keep_id;

  DELETE FROM "Endereco"    WHERE "clienteId" <> keep_id;
  DELETE FROM "Contato"     WHERE "clienteId" <> keep_id;
  DELETE FROM "TabelaPreco" WHERE "clienteId" <> keep_id;
  UPDATE "User" SET "clienteId" = NULL WHERE "clienteId" IS NOT NULL AND "clienteId" <> keep_id;
  DELETE FROM "Cliente" WHERE id <> keep_id;

  RAISE NOTICE 'Reset concluido. Mantido apenas o cliente #%.', keep_id;
END $$;
