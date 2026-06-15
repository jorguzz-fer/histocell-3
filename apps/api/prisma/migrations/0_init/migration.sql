-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "clienteId" INTEGER,
    "primeiroAcesso" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "documento" TEXT NOT NULL,
    "inscricaoEstadual" TEXT,
    "idEtiqueta" TEXT,
    "email" TEXT NOT NULL,
    "emailFinanceiro" TEXT,
    "emailMacroscopia" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "segmento" TEXT NOT NULL DEFAULT 'recorrente',
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endereco" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'entrega',
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "cep" CHAR(9) NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contato" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabelaPreco" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "TabelaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigoLegado" INTEGER,
    "categoria" TEXT NOT NULL DEFAULT 'Outros',
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoBase" DECIMAL(10,2) NOT NULL,
    "precoRotina" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precoPesquisa" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tipo" TEXT,
    "variante1" TEXT,
    "variante2" TEXT,
    "variante3" TEXT,
    "variante4" TEXT,
    "variante5" TEXT,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicoFavorito" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicoFavorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "dataEnvio" TIMESTAMP(3),
    "dataRecebimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amostra" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "numeroInterno" TEXT NOT NULL,
    "numeroCliente" TEXT,
    "especie" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "localizacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "observacoes" TEXT,
    "dataRecebimento" TIMESTAMP(3),
    "recebidoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amostra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemServico" (
    "id" SERIAL NOT NULL,
    "amostraId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'fila',
    "etapaAtual" TEXT NOT NULL DEFAULT 'triagem',
    "prioridade" TEXT NOT NULL DEFAULT 'normal',
    "responsavel" TEXT,
    "observacoes" TEXT,
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtapaOS" (
    "id" SERIAL NOT NULL,
    "ordemServicoId" INTEGER NOT NULL,
    "etapa" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "responsavel" TEXT,
    "observacoes" TEXT,
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "EtapaOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laudo" (
    "id" SERIAL NOT NULL,
    "ordemServicoId" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "macroscopia" TEXT,
    "microscopia" TEXT,
    "diagnostico" TEXT,
    "assinadoPor" TEXT,
    "assinadoEm" TIMESTAMP(3),
    "liberado" BOOLEAN NOT NULL DEFAULT false,
    "liberadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Laudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" SERIAL NOT NULL,
    "amostraId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "impresso" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroQualidade" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "responsavel" TEXT,
    "resolucao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" TIMESTAMP(3),

    CONSTRAINT "RegistroQualidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "validade" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "aprovadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrcamento" (
    "id" SERIAL NOT NULL,
    "orcamentoId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ItemOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" SERIAL NOT NULL,
    "orcamentoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fatura" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemFatura" (
    "id" SERIAL NOT NULL,
    "faturaId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ItemFatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditoPrePago" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "saldo" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditoPrePago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "details" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Cliente_documento_idx" ON "Cliente"("documento");

-- CreateIndex
CREATE INDEX "Cliente_nome_idx" ON "Cliente"("nome");

-- CreateIndex
CREATE INDEX "Endereco_clienteId_idx" ON "Endereco"("clienteId");

-- CreateIndex
CREATE INDEX "Contato_clienteId_idx" ON "Contato"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "TabelaPreco_clienteId_servicoId_key" ON "TabelaPreco"("clienteId", "servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "Servico_codigo_key" ON "Servico"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Servico_codigoLegado_key" ON "Servico"("codigoLegado");

-- CreateIndex
CREATE INDEX "Servico_codigo_idx" ON "Servico"("codigo");

-- CreateIndex
CREATE INDEX "Servico_categoria_idx" ON "Servico"("categoria");

-- CreateIndex
CREATE INDEX "Servico_codigoLegado_idx" ON "Servico"("codigoLegado");

-- CreateIndex
CREATE INDEX "Servico_tipo_idx" ON "Servico"("tipo");

-- CreateIndex
CREATE INDEX "ServicoFavorito_userId_idx" ON "ServicoFavorito"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicoFavorito_userId_servicoId_key" ON "ServicoFavorito"("userId", "servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");

-- CreateIndex
CREATE INDEX "Pedido_numero_idx" ON "Pedido"("numero");

-- CreateIndex
CREATE INDEX "Pedido_status_idx" ON "Pedido"("status");

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "Amostra_numeroInterno_key" ON "Amostra"("numeroInterno");

-- CreateIndex
CREATE INDEX "Amostra_pedidoId_idx" ON "Amostra"("pedidoId");

-- CreateIndex
CREATE INDEX "Amostra_numeroInterno_idx" ON "Amostra"("numeroInterno");

-- CreateIndex
CREATE INDEX "Amostra_status_idx" ON "Amostra"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServico_amostraId_key" ON "OrdemServico"("amostraId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServico_numero_key" ON "OrdemServico"("numero");

-- CreateIndex
CREATE INDEX "OrdemServico_status_idx" ON "OrdemServico"("status");

-- CreateIndex
CREATE INDEX "OrdemServico_etapaAtual_idx" ON "OrdemServico"("etapaAtual");

-- CreateIndex
CREATE INDEX "EtapaOS_ordemServicoId_idx" ON "EtapaOS"("ordemServicoId");

-- CreateIndex
CREATE UNIQUE INDEX "Laudo_ordemServicoId_key" ON "Laudo"("ordemServicoId");

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_codigo_key" ON "Etiqueta"("codigo");

-- CreateIndex
CREATE INDEX "Etiqueta_codigo_idx" ON "Etiqueta"("codigo");

-- CreateIndex
CREATE INDEX "Etiqueta_amostraId_idx" ON "Etiqueta"("amostraId");

-- CreateIndex
CREATE UNIQUE INDEX "Orcamento_numero_key" ON "Orcamento"("numero");

-- CreateIndex
CREATE INDEX "Orcamento_clienteId_idx" ON "Orcamento"("clienteId");

-- CreateIndex
CREATE INDEX "Orcamento_status_idx" ON "Orcamento"("status");

-- CreateIndex
CREATE INDEX "ItemOrcamento_orcamentoId_idx" ON "ItemOrcamento"("orcamentoId");

-- CreateIndex
CREATE INDEX "FollowUp_orcamentoId_idx" ON "FollowUp"("orcamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Fatura_numero_key" ON "Fatura"("numero");

-- CreateIndex
CREATE INDEX "Fatura_clienteId_idx" ON "Fatura"("clienteId");

-- CreateIndex
CREATE INDEX "Fatura_status_idx" ON "Fatura"("status");

-- CreateIndex
CREATE INDEX "Fatura_periodo_idx" ON "Fatura"("periodo");

-- CreateIndex
CREATE INDEX "ItemFatura_faturaId_idx" ON "ItemFatura"("faturaId");

-- CreateIndex
CREATE INDEX "CreditoPrePago_clienteId_idx" ON "CreditoPrePago"("clienteId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endereco" ADD CONSTRAINT "Endereco_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contato" ADD CONSTRAINT "Contato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabelaPreco" ADD CONSTRAINT "TabelaPreco_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabelaPreco" ADD CONSTRAINT "TabelaPreco_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicoFavorito" ADD CONSTRAINT "ServicoFavorito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicoFavorito" ADD CONSTRAINT "ServicoFavorito_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amostra" ADD CONSTRAINT "Amostra_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_amostraId_fkey" FOREIGN KEY ("amostraId") REFERENCES "Amostra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaOS" ADD CONSTRAINT "EtapaOS_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laudo" ADD CONSTRAINT "Laudo_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etiqueta" ADD CONSTRAINT "Etiqueta_amostraId_fkey" FOREIGN KEY ("amostraId") REFERENCES "Amostra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFatura" ADD CONSTRAINT "ItemFatura_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "Fatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

