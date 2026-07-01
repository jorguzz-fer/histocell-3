-- Comunicação com o cliente: Motivos (por setor) + log de Comunicações.

CREATE TABLE IF NOT EXISTS "Motivo" (
  "id" SERIAL PRIMARY KEY,
  "setor" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "mensagemTemplate" TEXT NOT NULL,
  "notificaCliente" BOOLEAN NOT NULL DEFAULT true,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Motivo_setor_idx" ON "Motivo"("setor");

CREATE TABLE IF NOT EXISTS "Comunicacao" (
  "id" SERIAL PRIMARY KEY,
  "pedidoId" INTEGER,
  "ordemServicoId" INTEGER,
  "setor" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "assunto" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "destinatario" TEXT,
  "criadoPor" TEXT,
  "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
  "emailInfo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Comunicacao_pedidoId_idx" ON "Comunicacao"("pedidoId");
CREATE INDEX IF NOT EXISTS "Comunicacao_ordemServicoId_idx" ON "Comunicacao"("ordemServicoId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Comunicacao_pedidoId_fkey') THEN
    ALTER TABLE "Comunicacao" ADD CONSTRAINT "Comunicacao_pedidoId_fkey"
      FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Motivos padrão (só se a tabela estiver vazia)
INSERT INTO "Motivo" ("setor","titulo","mensagemTemplate","notificaCliente","ativo","createdAt","updatedAt")
SELECT * FROM (VALUES
  ('recepcao','Amostra faltante','Olá {cliente}, no pedido {pedido} recebemos menos amostras do que o previsto. {obs} Por favor, entre em contato para alinharmos.',true,true,now(),now()),
  ('recepcao','Amostra a mais (excedente)','Olá {cliente}, no pedido {pedido} recebemos amostras a mais do que o previsto. {obs} Vamos validar a cobrança do excedente.',true,true,now(),now()),
  ('tecnica','Material inadequado (reprocessar)','Olá {cliente}, referente ao pedido {pedido}: o material apresentou problema e precisará ser reprocessado. {obs}',true,true,now(),now()),
  ('tecnica','Coloração refeita','Olá {cliente}, referente ao pedido {pedido}: precisaremos refazer uma coloração. {obs} As demais amostras seguem no prazo.',true,true,now(),now()),
  ('geral','Atraso na entrega','Olá {cliente}, referente ao pedido {pedido}: tivemos um imprevisto e a entrega será adiada. {obs}',true,true,now(),now()),
  ('expedicao','Material disponível para retirada','Olá {cliente}, o material do pedido {pedido} está pronto e disponível para retirada. {itens} {obs}',true,true,now(),now())
) AS v("setor","titulo","mensagemTemplate","notificaCliente","ativo","createdAt","updatedAt")
WHERE NOT EXISTS (SELECT 1 FROM "Motivo");
