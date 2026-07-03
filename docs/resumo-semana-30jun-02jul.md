# Resumo da semana — 30/06 a 02/07/2026

**27 commits · ~110 arquivos · +6.215 linhas.** Do planejamento das homologações
ao bloco de lançamento completo (E1–E10), code-review e ajustes de deploy.

---

## 📋 Planejamento & homologações (docs)
- Análise da **4ª homologação** (fluxo OS / macroscopia / etiquetas)
- Análise da **5ª homologação** (FAPESP, divergência, novo serviço, laudo, NF)
- Análise da **7ª reunião** (mínimo para lançar — gaps detalhados)
- Análise da **API do Cora** (cobrança / boleto / Pix / NFS-e + checklist de credenciais)
- **Spec de Lançamento** (MVP: épicos E1–E10, dados, aceite, dependências, cronograma)
- **Checklist de validação** para o deploy de lançamento

## 🔬 Fluxo operacional (recebimento → OS → fluxo)
- **OS automática** ao receber (1 por amostra; herda urgência/responsável)
- **E1 — Fluxo completo de etapas** (8 setores na Fila e na OS:
  triagem → macro → processamento → microtomia → coloração → laudo → finalização → expedição)
- **E5 — Conferência fina** (bipagem das lâminas, trava da OS, relatório de pendências)
- Campo **"gera etiqueta?"** no serviço + filtro na conferência
- **Rastreio** mostra a quantidade prevista do orçamento na macroscopia
- **"Recebendo" digitável** na conferência do recebimento

## 📣 Comunicação com o cliente
- **E2 — Infra de e-mail** (`MailService` via Resend, graceful sem credencial)
- **E3/E4/E8 — Motivos por setor + notificação + histórico** (ocorrências,
  aviso de material pronto, liberação parcial, log na OS)
- **CRUD de Motivos** (admin, só gerência)

## 💰 Financeiro & cobrança
- **Integração Cora** completa (boleto/Pix — módulo pronto, aguardando credenciais)
- **Cobrança programada** por cliente + agendador
- **E9 — Relatório financeiro detalhado** (discriminação por serviço, base da NF)
- **Laudo por e-mail** (admin solicita/anexa PDF; cliente vê no portal)

## 🎫 Orçamento, etiquetas & cadastro
- **E6 — Prazo de entrega** por serviço + confirmação obrigatória no orçamento
- **E7 — Impressão de etiqueta parametrizável** por tamanho (Zebra) + UI de config
- **Projeto FAPESP** no cliente pesquisador + **"Novo serviço" só gerência**
- **E10 — Cor por cliente** na fila da microscopia

## 🛠️ Qualidade & deploy
- **15 correções do code-review** pré-lançamento (todas confirmadas e validadas)
- **Fixes de deploy**: idempotência das migrations, `curl` para healthcheck,
  `.dockerignore`, e **auto-recuperação de migration presa em P3009**
- Reconciliação de merge com as branches paralelas (Fundação/etiqueta/divergência)

---

## Marcos
- Todo o **bloco de lançamento E1–E10** foi para `main`.
- Passou por um **code-review completo** com correções aplicadas.
- **Deploy** a um merge + reimplantação de ficar verde (aplicar o fix do P3009).

## Pendências para o deploy
- Mergear os PRs abertos e **reimplantar a API** (destrava o P3009 e sobe as migrations).
- Configurar secrets no Coolify: **Resend** (`MAIL_*`) e, quando ativar cobrança,
  **Cora** (`CORA_*` + `CORA_WEBHOOK_SECRET`).
- Instalar a **Zebra** e ajustar o tamanho da etiqueta (presencial).
- Rodar a validação de fluxo do `docs/checklist-deploy-lancamento.md`.
