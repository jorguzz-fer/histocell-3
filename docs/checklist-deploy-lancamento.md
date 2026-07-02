# Checklist de validação — Lançamento Histocell

Para Jorge + Célio seguirem no deploy. Ordem: **subir → configurar → validar fluxo**.

## 1. Deploy (Coolify)
- [ ] **API** — o `docker-entrypoint.sh` roda `prisma migrate deploy` sozinho. Confirmar nos logs que aplicou as migrações novas:
  `pacote_preco_hibrido`, `normalizar_codigos_pacotes`, `servico_gera_etiqueta`, `cliente_projeto`, `laudo_email`, `fatura_cobranca_cora`, `cliente_cobranca_programada`, `conferencia`, `conferencia_fina`, `prazo_entrega`.
- [ ] **web-admin** — redeploy (force rebuild / sem cache se houver mudança só de CSS).
- [ ] **web-cliente** (portal) — redeploy.

## 2. Variáveis de ambiente (secrets no Coolify)
- [ ] **E-mail (Resend)** — destrava notificações/motivos:
  `MAIL_PROVIDER=resend` · `MAIL_API_KEY=re_xxx` · `MAIL_FROM=Histocell <no-reply@SEUDOMINIO>`
  (verificar o domínio no painel do Resend antes).
- [ ] **Cora** (quando for ativar cobrança): `CORA_ENV`, `CORA_CLIENT_ID`, `CORA_CERT`, `CORA_KEY` (+ opcionais `CORA_MULTA_PCT`, `CORA_JUROS_MES_PCT`). Registrar o webhook `POST https://<api>/cobranca/webhook/cora`.
- [ ] Sem essas credenciais o sistema **roda normal** — só não envia e-mail nem emite boleto.

## 3. Operacional (presencial)
- [ ] Instalar a **impressora Zebra** na recepção (Rod). Em **Etiquetas → Tamanho**, ajustar largura×altura do rolo (ex.: 50×30 mm) e imprimir uma etiqueta de teste.

## 4. Validação do fluxo (rotina, cliente existente)
- [ ] **Cadastro**: abrir um cliente; se pesquisador, conferir o campo **Projeto (FAPESP)**.
- [ ] **Recebimento**: registrar entrada de 1 recipiente → **imprime etiqueta** → pedido cai no **Laboratório**.
- [ ] **Conferência de entrada**: qtd prevista × recebida; divergência → **aprovar divergência** na Fila.
- [ ] **OS automática**: a OS foi criada e aparece na **Fila** (colunas: Triagem → Macroscopia → Processamento → Microtomia → Coloração → Laudo → Finalização → Expedição).
- [ ] **Rastreio**: o item aparece com a **qtd prevista** e anda pelos setores ao escanear.
- [ ] **Conferência fina** (na OS, botão 🔵 scan): bipar as lâminas → verde/vermelho; tentar avançar da **Finalização** sem completar → deve **travar**; completar ou **liberar com justificativa** → avança para Expedição.
- [ ] **Comunicação** (na OS, botão 💬):
  - Registrar **ocorrência** (ex.: recepção "amostra faltante") → mensagem pré-pronta → cliente recebe e-mail (se Resend ligado) + entra no **Histórico**.
  - **Notificar pronto** / liberação parcial na expedição.
- [ ] **Prazo**: montar um **Orçamento**; o prazo puxa dos serviços; ao **Enviar**, aparece o **pop-up de confirmação do prazo**.
- [ ] **Portal do cliente** (link sem login): cliente vê pedidos, **2ª via**, **laudos liberados**, saldo.

## 5. Financeiro
- [ ] **Fechamento mensal** → por cliente: bruto, adiantado, a faturar, crédito.
- [ ] **Detalhe** (discriminação por serviço) — base da NF de projeto.
- [ ] **Gerar cobrança** (quando Cora ligado) → boleto/Pix.
- [ ] **Cobrança programada**: marcar um cliente como automática + dia; o sistema fatura o mês no dia escolhido.

## 6. Perfis
- [ ] Logar como **técnico**: telas com valor (Orçamento/Pacotes/Financeiro/Comercial/Relatórios) **não aparecem** e a URL direta redireciona.
- [ ] **Motivos** (menu, só gerência): revisar/editar os textos das mensagens pré-prontas por setor.

## 7. Pós-lançamento (não bloqueia)
- NFS-e/boleto real (Cora), IA no portal, refinos de dashboard.
