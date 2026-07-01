# Spec de Lançamento — Histocell

Consolidação do que é necessário para **colocar o sistema para rodar** (MVP aceitável),
a partir das homologações com o Célio (3ª–7ª sessões) e do estado atual do código.

- **Objetivo:** o laboratório operar o dia a dia da rotina no Histocell (não no sistema antigo),
  do recebimento à retirada, com comunicação ao cliente e cobrança.
- **Princípio:** lançar o **mínimo aceitável** e evoluir rodando. Cada épico abaixo tem
  escopo de lançamento enxuto; refinamentos ficam para pós-lançamento.

---

## 0. Baseline — já pronto (não relançar)
Cadastro de cliente (+ Projeto FAPESP), Recebimento em 2 etapas (Recepção→Laboratório),
fila Web×Local, conferência previsto×recebido + aprovar divergência, **OS automática**,
Rastreio (7 setores) + qtd prevista do orçamento, Etiquetas Code128 (emissão),
Orçamento (preço/desconto/rascunho), Pacotes (código automático + híbrido),
Portal do cliente (pedido, crédito, 2ª via, laudos), Fechamento mensal,
Módulo de Cobrança Cora (aguardando credenciais), Laudo por e-mail (mailto),
Relatório de tempos, Perfil técnico sem valores.

---

## 1. Dependências externas (decisões do Célio) — BLOQUEIAM parte do escopo
| Dep | Necessário para | Ação do Célio |
|---|---|---|
| **SMTP / e-mail transacional** (Resend/SES/SMTP) | Notificações ao cliente, Motivos, avisos de expedição/atraso | Escolher provedor + credenciais |
| **Cora (credenciais stage/prod)** | Boleto/Pix/NFS-e | Habilitar API + enviar cert/key/client_id |
| **Impressora Zebra** (modelo + tamanho etiqueta) | Impressão de etiqueta na recepção | Informar modelo + instalar (presencial) |

> Recomendação: adotar **Resend** (simples, API HTTP, sem mTLS) para e-mail — destrava os épicos de comunicação rapidamente.

---

## 2. Épicos de lançamento (ordenados por prioridade)

### E1 — Fluxo completo de etapas (Fila + OS) ✅ FEITO (commit 1cff6a0)
**Por quê:** hoje a Fila (`macroscopia/processamento/laudo`) e a OS (`triagem/macroscopia/processamento/laudo`) não têm todos os setores do fluxo real. O Rastreio já tem os 7.
- **Etapas oficiais:** Recepção → Macroscopia → Processamento/Inclusão → Microtomia (Corte) → Coloração/Montagem → (Laudo, quando houver) → **Finalização/Conferência fina** → Expedição/Retirada.
- **Backend:** unificar a lista de etapas (uma fonte única) usada por Fila, OS e Rastreio; ajustar `ETAPAS_ORDEM` e `fila.service`.
- **Frontend:** a Fila mostra colunas de todas as etapas; avançar/retroceder entre elas.
- **Aceite:** um item percorre todas as etapas na Fila e no Rastreio, sem etapa faltando.

### E2 — Envio de e-mail (infra) ✅ FEITO (Resend; aguardando MAIL_API_KEY)
**Por quê:** base para E3, E4, E7.
- **Backend:** `MailService` (provedor via env: `MAIL_PROVIDER`, `MAIL_API_KEY`/SMTP, `MAIL_FROM`), com fallback "não configurado" (não quebra). Templates simples com variáveis.
- **Aceite:** com credencial, `mailService.enviar()` entrega; sem credencial, registra e segue.

### E3 — Motivos/ocorrências por setor + comunicação ao cliente ✅ FEITO (UI de motivos-admin pendente; envio real com MAIL_API_KEY)
**Por quê:** núcleo da comunicação (recepção e técnica) pedido pelo Célio.
- **Dados:** `Motivo { id, setor, titulo, mensagemTemplate, notificaCliente, notificaLab, ativo }`; `Ocorrencia { id, ordemId/pedidoId, motivoId, setor, texto, criadoPor, criadoEm, emailEnviado }`.
- **Backend:** CRUD de Motivos (gerência); registrar Ocorrência → dispara e-mail ao cliente (template) + registra no histórico da OS.
- **Frontend:** em cada setor (Recepção/Rastreio/OS), botão "Registrar ocorrência" → escolhe motivo do setor → prévia da mensagem → envia. Motivos **escopados por setor**.
- **Aceite:** recepção registra "amostra faltante (10→9)" → cliente recebe e-mail + fica no histórico da OS; técnica tem motivos próprios.

### E4 — Notificação de conclusão/retirada + liberação parcial ✅ FEITO
**Por quê:** avisar o cliente quando pronto foi o ponto mais batido na reunião.
- **Backend:** ao mover para **Expedição**, dispara e-mail "material disponível para retirada" (com nº do pedido/itens). Suporte a **liberação parcial**: marcar itens prontos e um com problema/atraso → e-mail explicando o que está pronto e o que atrasou.
- **Frontend:** ação "Liberar/Notificar" na expedição; seleção de itens liberados vs pendentes.
- **Aceite:** ao liberar, cliente recebe e-mail; liberação parcial envia mensagem correta.

### E5 — Pendências + trava de finalização da OS (conferência fina/bipagem) ✅ FEITO
**Por quê:** impedir material incompleto de ser liberado.
- **Dados:** por OS/amostra, estado de conferência (esperado × bipado); `pendente` até completar.
- **Backend:** endpoint de "bipar" item na conferência fina; OS **não finaliza** enquanto houver item não bipado, salvo registro de motivo (E3).
- **Frontend:** tela de **conferência fina** com bipagem; item bipado **verde**, faltante **vermelho**; OS travada até resolver. **Relatório de pendências** (por cliente/setor).
- **Aceite:** bipando 9 de 10, a OS fica vermelha e não avança para expedição até resolver ou justificar.

### E6 — Prazo de entrega no orçamento ✅ FEITO
- **Dados:** `Servico.prazoDias` (default 1 = 24h); `Pedido.prazoDias`.
- **Backend:** ao criar orçamento, `prazoDias` = maior prazo dos itens (ou definido); editável por quem faz orçamento.
- **Frontend:** campo de prazo no orçamento; **pop-up obrigatório** confirmando o prazo antes de finalizar/enviar.
- **Aceite:** não finaliza o orçamento sem confirmar o prazo; prazo puxa dos serviços.

### E7 — Impressão de etiqueta (config de tamanho) ✅ FEITO
- **Frontend:** tela de impressão parametrizável (tamanho, ex.: 10×3 cm; múltiplas empilhadas).
- **Operacional:** instalar a Zebra (presencial); Jorge configura o layout a partir do modelo/tamanho informado.
- **Aceite:** recepção imprime a etiqueta do recipiente no tamanho correto.

### E8 — Log de comunicações na OS ✅ FEITO (histórico por pedido no drawer)
- **Backend/Frontend:** histórico da OS exibindo e-mails/motivos enviados (quem, quando, para quem, texto). Reusa `AuditService` + Ocorrencia (E3).
- **Aceite:** atendente abre a OS e vê todo o histórico de comunicação.

### E9 — Relatório financeiro detalhado (discriminação por serviço) ✅ FEITO
- **Backend/Frontend:** no fechamento/relatório, discriminar linha a linha por serviço (ex.: "10 H&E, 15 lâminas em branco, 10 específica") por cliente/período — base para a NF de projeto.
- **Aceite:** relatório mostra a discriminação; exportável.

### E10 — UX da fila (cor por cliente) ✅ FEITO
- Colorir por cliente na fila da microscopia. (Pós-lançamento se apertar.)

---

## 3. Fora do escopo de lançamento (pós-lançamento)
- Emissão real de **NFS-e/boleto Cora** (entra quando as credenciais chegarem — módulo já pronto).
- **IA** para ajudar leigos a escolher serviço no portal.
- Automação SMTP total do laudo (hoje mailto → migra para `MailService` quando E2 existir).
- Refinos de dashboard/relatórios avançados.

---

## 4. Sequência sugerida (cronograma)
1. **E1** (etapas) + **E7** (etiqueta) → fluxo rotina roda ponta a ponta. *(pode lançar já isto)*
2. **E2** (e-mail infra) — assim que o Célio escolher o provedor.
3. **E4** (notificação de pronto) + **E3** (motivos) — comunicação com cliente.
4. **E5** (pendências/trava) — qualidade da entrega.
5. **E6** (prazo) + **E8** (log) + **E9** (relatório detalhado).
6. **Cora** e **E10** conforme credenciais/tempo.

## 5. Critérios de "pronto para lançar" (Definition of Ready)
- [ ] E1 fluxo completo na Fila/OS/Rastreio
- [ ] E7 etiqueta imprimindo no tamanho certo (impressora instalada)
- [ ] E2 e-mail funcionando (provedor definido)
- [ ] E4 notificação de material pronto
- [ ] E3 motivos de recepção + técnica com e-mail ao cliente
- [ ] E5 OS trava sem conferência completa
- [ ] E6 prazo confirmado no orçamento
- [ ] Cobrança: ao menos a **indicação/fechamento** por cliente (boleto real quando Cora entrar)

## 6. Riscos
- **E-mail sem provedor** trava E3/E4/E8 → decidir SMTP/Resend cedo.
- **Impressora** presencial → depende de visita (Rod).
- **Escopo dos "motivos"** pode crescer → começar com um conjunto fixo por setor e evoluir.
