-- ============================================================================
-- Reset para PRODUÇÃO — zera todo o movimento operacional e financeiro,
-- preservando os cadastros (clientes, usuários, serviços, pacotes, papéis).
--
-- MANTÉM:
--   Cliente, Endereco, Contato, TabelaPreco, Contrato
--   User, Papel, PapelPermissao, ServicoFavorito
--   Servico, Pacote, PacoteItem, TipoRecipiente, Motivo
--
-- APAGA (tudo, sem filtro de cliente):
--   Pedido, ItemPedido, Recipiente, Amostra
--   OrdemServico, EtapaOS, Laudo
--   Etiqueta, RastreioEvento
--   Orcamento, ItemOrcamento, FollowUp
--   Fatura, ItemFatura, CreditoPrePago
--   Comunicacao, RegistroQualidade, AuditLog, RefreshToken
--
-- Também reinicia toda a numeração do 1: ids das tabelas apagadas,
-- número de etiqueta e número interno de amostra.
--
-- Como rodar (no container do POSTGRES, não no da API):
--   psql -U histocell -d histocell -f reset-producao.sql
-- ou cole este bloco inteiro no psql.
--
-- ⚠️ IRREVERSÍVEL. Faça backup/snapshot do banco antes de rodar.
-- ⚠️ Rode com a API parada (ou fora do horário de uso) para não gravar
--    registros no meio da limpeza.
--
-- Atômico: roda inteiro dentro de um bloco; qualquer erro desfaz tudo.
-- Não usa CASCADE de propósito — se alguma tabela nova passar a referenciar
-- as tabelas abaixo e não estiver na lista, o script falha em vez de apagar
-- dados silenciosamente.
-- ============================================================================
DO $$
DECLARE
  -- Ordem irrelevante: o TRUNCATE de todas juntas satisfaz as FKs entre elas.
  alvos text[] := ARRAY[
    'RastreioEvento', 'Etiqueta',
    'Laudo', 'EtapaOS', 'OrdemServico',
    'Amostra', 'Recipiente', 'ItemPedido', 'CreditoPrePago', 'Comunicacao', 'Pedido',
    'ItemFatura', 'Fatura',
    'FollowUp', 'ItemOrcamento', 'Orcamento',
    'RegistroQualidade', 'AuditLog', 'RefreshToken'
  ];
  existentes text[] := '{}';
  t text;
  n bigint;
  total bigint := 0;
BEGIN
  -- Antes: quantas linhas serão apagadas (e quais tabelas existem neste banco).
  FOREACH t IN ARRAY alvos LOOP
    IF to_regclass(format('%I', t)) IS NULL THEN
      RAISE NOTICE '  -  %: tabela nao existe neste banco (ignorada)', t;
      CONTINUE;
    END IF;
    EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
    RAISE NOTICE '  x  %: % linha(s)', t, n;
    total := total + n;
    existentes := existentes || format('%I', t);
  END LOOP;

  IF array_length(existentes, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhuma tabela de movimento encontrada — banco errado? Abortando.';
  END IF;

  -- Trava de segurança: o reset preserva cadastros; se não há nenhum cliente
  -- nem usuário, este não é o banco de produção que se espera limpar.
  IF (SELECT count(*) FROM "User") = 0 THEN
    RAISE EXCEPTION 'Nenhum usuario cadastrado — banco errado? Abortando.';
  END IF;

  RAISE NOTICE 'Total a apagar: % linha(s) em % tabela(s).', total, array_length(existentes, 1);

  -- RESTART IDENTITY zera os ids (Pedido #1, OS #1, Fatura #1...).
  EXECUTE 'TRUNCATE TABLE ' || array_to_string(existentes, ', ') || ' RESTART IDENTITY';

  -- Numeração de etiqueta e de amostra vive em sequences próprias.
  IF to_regclass('"histocell_etiqueta_numero_seq"') IS NOT NULL THEN
    ALTER SEQUENCE "histocell_etiqueta_numero_seq" RESTART WITH 1;
    RAISE NOTICE 'Numeracao de etiqueta reiniciada em 1.';
  END IF;
  IF to_regclass('"histocell_amostra_numero_seq"') IS NOT NULL THEN
    ALTER SEQUENCE "histocell_amostra_numero_seq" RESTART WITH 1;
    RAISE NOTICE 'Numeracao interna de amostra reiniciada em 00001.';
  END IF;

  -- Faturas apagadas: os contratos não podem achar que já cobraram o mês.
  IF to_regclass('"Contrato"') IS NOT NULL THEN
    UPDATE "Contrato" SET "ultimaCobrancaEm" = NULL WHERE "ultimaCobrancaEm" IS NOT NULL;
  END IF;

  RAISE NOTICE 'Reset concluido. Cadastros preservados: % cliente(s), % usuario(s), % servico(s).',
    (SELECT count(*) FROM "Cliente"),
    (SELECT count(*) FROM "User"),
    (SELECT count(*) FROM "Servico");
END $$;
