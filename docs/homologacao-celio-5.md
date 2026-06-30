# Homologação Célio — 5ª sessão (FAPESP, divergência, novo serviço, LAUDO, NF)

## O que o Célio revalidou (já estava feito) ✅
- Cliente → Recebimento → **fila** (microscopia/processamento/laudo) = Rastreio.
- **Conferência** previsto×recebido na microscopia + **qtd prevista do orçamento** na tela.
- **OS gerada** a partir do recebimento (agora automática).
- Editar nome de serviço/laudo pelo lápis.
- Portal do cliente (histórico, mais usados, pacotes).

> Ele não via na fila porque ainda não tinha feito o deploy do que fizemos — é deploy, não falta de implementação.

## Novos pedidos desta reunião

| # | Pedido | Estado | Esforço |
|---|---|---|---|
| 1 | **Campo "Projeto" (FAPESP/financiamento) no cliente pesquisador** — abre ao escolher "pesquisador"; guarda o nº do projeto | 🆕 não existe (Cliente tem `segmento`, não tem projeto) | Pequeno |
| 2 | **"Novo serviço" só para gerência (admin)** — colaborador/recepção não cria serviço (não pode dar preço) | 🟡 hoje é `gerencia` **e** `recepcao`; botão sempre visível | Pequeno |
| 3 | **"Aprovar divergência"** na conferência da microscopia (recebeu 4 de 5 → aprova e segue) | 🟡 temos previsto×recebido + excedente + notas, mas **sem ação explícita de aprovar** | Médio |
| 4 | **LAUDO** (fluxo completo) | 🆕 modelo `Laudo` existe (texto), mas **sem módulo/fluxo** | **Grande** |
| 5 | **Nota fiscal detalhada** (pesquisa = linha a linha; rotina = descrição simples) + **projeto na NF** | ⛔ depende da **emissão de NF (Cora)** — bloqueado por credenciais | — |
| 6 | **IA para leigos escolherem serviço** no portal | ⏭️ próxima fase (Célio adiou) | — |

## Detalhe do LAUDO (item 4)
Fluxo do Célio:
1. Cliente contrata laudo à parte; material entra normal (macro → técnica → lâmina).
2. O **colaborador precisa lançar o laudo** (gatilho) — senão a Histocell paga o patologista e não cobra o cliente.
3. O **patologista é externo**: ideia de gerar um **link** para ele subir imagens + laudo (PDF), ou informar o e-mail dele e enviar.
4. Quando o patologista **libera**, o laudo fica disponível.
5. **Portal do cliente**: "Histórico de laudos liberados" + botão **"Ver resultado"** no pedido que tem laudo (baixar PDF).

⚠️ O modelo `Laudo` atual é **texto** (conteudo/macro/micro/diagnóstico). O Célio descreve **PDF do patologista externo** — então precisaria de campo de **arquivo (PDF)** + patologista (e-mail/link) + estado liberado. É uma feature própria, com decisão de escopo.

## Recomendação de ordem
1. **Rápidos agora**: (1) campo Projeto FAPESP no cliente + (2) restringir "Novo serviço" à gerência.
2. **Médio**: (3) "Aprovar divergência" na conferência.
3. **Grande, com decisão**: (4) Laudo — definir se é upload de PDF (externo) e como o patologista entrega (link público vs e-mail).
4. **Bloqueado**: (5) NF detalhada — entra junto com a integração Cora (credenciais).
