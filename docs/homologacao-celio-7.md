# Homologação/Review Célio — 7ª sessão ("mínimo para lançar")

Reunião de mentoria com foco em definir o MÍNIMO aceitável para começar a rodar.
Célio está ansioso para lançar. Muita coisa nova, principalmente em **comunicação
com o cliente** e **controle de pendências**.

## ✅ Já temos (validado na reunião)
- Cadastro de cliente **com campo Projeto (FAPESP)** ao marcar "pesquisador".
- Recebimento em 2 etapas + fila **Web × Local**.
- Conferência previsto×recebido + **excedente/divergência** (aprovar divergência).
- **OS automática** no recebimento.
- **Rastreio** com 7 departamentos (inclui Microtomia/Corte e Expedição) + qtd prevista.
- Portal do cliente (pedido, crédito).
- Orçamento (preço + desconto).

> A maior parte do fluxo "rotina" já foi validada como funcionando. Falta acertar impressão de etiqueta e os itens abaixo.

## 🆕 O que ainda NÃO temos (detalhado)

### 1. Notificações ao cliente por e-mail (GRANDE) — tema central da reunião
- **Disparo automático quando o material vai para Expedição / está pronto para retirada** ("as amostras estão disponíveis").
- **Liberação parcial**: avisar que N de M estão prontas e que uma teve problema/atraso.
- Depende de **infra de e-mail (SMTP)** — hoje só temos `mailto` (no laudo). É o "linchpin": vários itens abaixo dependem disso.

### 2. Motivos/ocorrências por setor com mensagens pré-prontas (GRANDE)
- Cada setor (Recepção, Técnica, Coloração, Expedição…) tem uma **aba de "Motivos"**.
- Motivos **escopados por setor** (recepção não usa os da técnica).
- Ao clicar num motivo: **envia mensagem pré-pronta ao cliente (e-mail)** + **notifica o laboratório** + **registra no histórico da OS**.
- Exemplos citados: amostra faltante (10 pedidas, 9 recebidas), material inadequado, coloração descolou, atraso/nova coleta.
- Precisa de **cadastro de motivos** (gerência) + templates de mensagem.

### 3. Pendências por setor + trava de finalização da OS + conferência fina por bipagem (GRANDE)
- Cada OS tem **pendências por setor**; **não pode finalizar/avançar** com item faltando.
- **Conferência fina** na sala técnica: bipa cada lâmina → bipado fica **verde**, faltante **vermelho**; OS **trava** até resolver ou registrar um motivo.
- **Dashboard visual** verde/vermelho por OS.
- **Relatório de pendências** (por cliente / por setor).
- É o que impede material incompleto de ir para a expedição.

### 4. Prazo de entrega (MÉDIO)
- Campo **prazo (dias)** por serviço na tabela de preços (default 24h).
- No **orçamento**, o prazo puxa automático dos serviços; quem faz orçamento pode **alterar**.
- **Pop-up de confirmação do prazo** antes de finalizar o orçamento (obrigatório confirmar).

### 5. Etapas do fluxo faltando na Fila e na OS (PEQUENO–MÉDIO)
- O **Rastreio** já tem os 7 setores. ✅
- Mas a **Fila** (`fila.service`: macroscopia/processamento/laudo) e a **OS** (`ETAPAS_ORDEM`: triagem/macroscopia/processamento/laudo) estão **incompletas**.
- Célio pediu **Corte (microtomia)**, **Coloração**, **Finalização** e **Expedição/Retirada** como etapas.
- Alinhar as etapas da OS/Fila com o fluxo real.

### 6. Descrição detalhada no relatório financeiro / fechamento (MÉDIO)
- Para clientes com **projeto** (e quem pedir): relatório/fechamento discriminando **linha a linha** ("10 H&E, 15 lâminas em branco, 10 específica").
- Temos fechamento **agregado** por cliente; falta o **detalhamento por serviço** no relatório final. (A NF discriminada = Cora.)

### 7. Histórico/log de comunicações na OS (MÉDIO)
- Toda comunicação (e-mails enviados, motivos acionados) registrada no **histórico da OS**, visível pela atendente.
- Temos `AuditService`; falta o **log de comunicação com o cliente por OS**.

### 8. UX da fila — cor por cliente (PEQUENO)
- Colorir cada cliente na fila da microscopia para facilitar a visualização.

### 9. Impressão de etiqueta — configuração (PEQUENO / operacional)
- Configurar **tamanho da etiqueta** (10×3 ou ~5×3 cm), imprimir uma embaixo da outra.
- Instalar/conectar a **Zebra** (o Rod instala presencialmente; Jorge precisa do modelo + tamanho).
- Nosso lado: tela de impressão **parametrizável** pelo tamanho.

## 🎯 Mínimo para lançar (o que o Célio quer "para ontem")
1. **Impressão de etiqueta funcionando** (instalar impressora + config de tamanho).
2. **Fluxo rotina completo** ponta a ponta (cadastro → recebimento → etiqueta → macro → processamento → corte → finalização → retirada/expedição).
3. **Etapas Corte/Expedição/Finalização** na fila (item 5).
4. **Notificação básica ao cliente** quando pronto (item 1) — depende de SMTP.
5. Indicação de **cobrança** (já temos o módulo; falta credencial Cora).

## Dependência transversal
- **SMTP / envio de e-mail real** destrava os itens 1, 2, 7 e as notificações de expedição. Hoje só temos `mailto`. Precisamos de credenciais SMTP (ou serviço tipo Resend/SES) — decisão do Célio, como o Cora.
