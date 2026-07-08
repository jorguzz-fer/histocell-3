# Cronograma de Implantação e Treinamento — Sistema Histocell

> **Objetivo:** colocar o sistema em operação real no laboratório, com o time da
> Histocell **treinado e seguro** em cada funcionalidade, testando módulo a módulo
> antes do go-live pleno.
>
> **Princípio (herdado do piloto):** *rodar para aprender*. Treina, testa com dado
> real controlado, roda em paralelo ao sistema antigo, e só então desliga o antigo.
>
> **Data-base deste plano:** 08/07/2026. Todas as funcionalidades de lançamento
> (E1–E10 da `spec-lancamento.md`) estão **prontas e testadas em ambiente** —
> esta fase é de **implantação, treinamento e validação operacional**, não de
> desenvolvimento.
>
> **Formato:** o treinamento é feito **majoritariamente online** (videochamada com
> compartilhamento de tela), com **2 visitas presenciais** no laboratório nos
> momentos que exigem estar fisicamente lá — instalação de equipamento e
> acompanhamento do go-live. As demais sessões são remotas.

---

## 1. Visão geral (5 semanas)

| Semana | Período | Foco | Marco |
|---|---|---|---|
| **S0 — Preparação** | 08–10/jul | Deploy em produção, secrets, impressora, contas de usuário | Ambiente no ar e acessível · 🏫 **Visita 1** |
| **S1 — Treinamento por módulo** | 13–17/jul | Capacitar cada função no seu módulo + teste controlado (online) | Time treinado; fluxo validado em simulação |
| **S2 — Piloto em paralelo** | 20–24/jul | 1 cliente real (Alquimipet) ponta a ponta, digitando nos dois sistemas | 1 pedido real percorreu todo o fluxo |
| **S3 — Escala do piloto** | 27–31/jul | Escalar para 3 clientes; refinar com problemas reais | 3 clientes operando; pendências resolvidas |
| **S4 — Go-live pleno** | 03–07/ago | Rotina 100% no Histocell; desligar sistema antigo | Sistema antigo desativado · 🏫 **Visita 2** |

> 🏫 = **visita presencial** no laboratório (2 no total). As demais sessões são **online**.

```
S0  ██ Deploy/infra ............................. 🏫 Visita 1 (10/jul)
S1     ████████ Treino + teste por módulo (online)
S2             ████████ Piloto 1 cliente (online, paralelo ao antigo)
S3                     ████████ Escala 3 clientes (online)
S4                             ████████ Go-live · desliga antigo .. 🏫 Visita 2 (03/ago)
    └── jul 8 ──── jul 13 ──── jul 20 ──── jul 27 ──── ago 3 ──── ago 7
    🏫 = presencial · demais sessões online
```

---

## 2. Papéis e responsáveis

| Papel | Pessoa(s) | Responsabilidade no treinamento |
|---|---|---|
| **Gerência / Financeiro** | Célio | Cadastro de clientes, Motivos, Financeiro/Fechamento, Cobrança, aprovações |
| **Recepção** | Equipe recepção | Recebimento, conferência de entrada, etiquetas, orçamento, ocorrências |
| **Técnica** (macro, processamento, corte, coloração) | Técnicos | Rastreio por setor, Fila, OS, conferência fina (bipagem) |
| **Expedição** | Recepção / técnico designado | Notificação de pronto, liberação parcial |
| **Admin / Suporte** | Jorge / Fernando | Deploy, configuração, perfis de acesso, suporte durante o piloto |

> **Canal direto de suporte** (Célio ↔ Jorge) ativo durante S1–S4 para tratar
> problemas conforme aparecem.

---

## 2.1 Formato das sessões — online × presencial

O treinamento é **majoritariamente online** (videochamada + compartilhamento de
tela + acesso ao sistema em produção). Há **2 visitas presenciais** no laboratório,
posicionadas nos momentos que só funcionam bem estando lá.

| Visita | Quando | Semana | Por que precisa ser presencial |
|---|---|---|---|
| **🏫 Visita 1 — Instalação & abertura** | Qui 10/jul | S0 | Instalar/testar a **impressora Zebra** na recepção, montar as **estações** (macro/rastreio), validar login em cada máquina e abrir o treinamento cara a cara com o time |
| **🏫 Visita 2 — Acompanhamento do go-live** | Seg 03/ago | S4 | Estar no laboratório no **primeiro dia 100% no Histocell**, resolver dúvidas na hora, dar segurança ao time para **desligar o sistema antigo** |

**Todas as demais sessões (S1 completa, piloto S2, escala S3) são online**, com
gravação recomendada para consulta posterior. As reuniões diárias de 15 min do
piloto e o canal Célio ↔ Jorge também são remotos.

| Semana | Modalidade |
|---|---|
| S0 — Preparação | Deploy/config remoto + **🏫 Visita 1 presencial** (instalação) |
| S1 — Treinamento por módulo | **Online** (todas as sessões) |
| S2 — Piloto 1 cliente | **Online** (operação acompanhada remotamente) |
| S3 — Escala 3 clientes | **Online** |
| S4 — Go-live pleno | **🏫 Visita 2 presencial** (abertura) + online no restante da semana |

---

## 3. Semana 0 — Preparação e deploy (08–10/jul)

Pré-requisito de tudo. Sem ambiente no ar, não há treinamento.

| # | Tarefa | Responsável | Referência |
|---|---|---|---|
| 0.1 | Deploy da **API** (confirmar migrations aplicadas nos logs) | Jorge | `checklist-deploy-lancamento.md` §1 |
| 0.2 | Deploy **web-admin** e **web-cliente** | Jorge | idem |
| 0.3 | Configurar **e-mail (Resend)** — `MAIL_PROVIDER/API_KEY/FROM` + verificar domínio | Jorge + Célio (decisão) | §2 |
| 0.4 | 🏫 **Visita 1 (presencial, Qui 10/jul):** instalar **impressora Zebra**, montar estações, validar login por máquina, abertura do treinamento com o time | Rod + Jorge | §3 · §2.1 |
| 0.5 | Criar **usuários** com perfis corretos (gerência × técnico) | Jorge | §6 |
| 0.6 | **Limpar 5 clientes fictícios**; deixar base pronta para o piloto | Célio + Jorge | `spec-fase-piloto.md` E2 |
| 0.7 | (Se for ativar cobrança) credenciais **Cora** + webhook | Jorge + Célio | §2 |

**Critério de saída da S0:** todos conseguem **logar**, a recepção **imprime uma
etiqueta de teste**, e um e-mail de teste chega à caixa do laboratório.

---

## 4. Semana 1 — Treinamento por módulo + teste controlado (13–17/jul)

Formato de cada sessão: **(1) demonstração → (2) mão na massa com dado de teste →
(3) checklist de aceite assinado**. Sessões de ~60–90 min. Usar **dados fictícios
de teste** (não misturar com o piloto real ainda).

### Seg 13/jul — Cadastro e Recebimento
| Sessão | Módulo | Quem treina | Teste / critério de aceite |
|---|---|---|---|
| S1.1 | **Cadastro de cliente** (+ Projeto FAPESP) | Célio, Recepção | Cadastrar 1 cliente pesquisador; campo Projeto aparece e sai no relatório |
| S1.2 | **Recebimento em 2 etapas** (Recepção → Laboratório) | Recepção | Dar entrada em 1 recipiente; pedido cai no Laboratório |
| S1.3 | **Conferência de entrada** (previsto × recebido, divergência) | Recepção | Registrar excedente (orçou 20, chegou 22) → observação p/ cobrança; aprovar divergência |

### Ter 14/jul — Etiquetas e Orçamento
| Sessão | Módulo | Quem treina | Teste / critério de aceite |
|---|---|---|---|
| S1.4 | **Etiquetas** (Code128, tamanho, empilhadas) | Recepção | Imprimir etiqueta do recipiente no tamanho correto; escanear o código |
| S1.5 | **Orçamento** (preço, desconto, busca por código exato) | Recepção, Célio | Montar orçamento; digitar código `1` traz só o serviço `1` |
| S1.6 | **Prazo de entrega** (pop-up de confirmação) | Recepção | Não finaliza o orçamento sem confirmar o prazo; prazo puxa dos serviços |

### Qua 15/jul — Rastreio e Fila (Técnica)
| Sessão | Módulo | Quem treina | Teste / critério de aceite |
|---|---|---|---|
| S1.7 | **Rastreio por setor** (7 departamentos, entrada/saída, TV, timeline) | Técnica | Escanear um item entrando/saindo de cada setor; sabe onde cada lâmina está |
| S1.8 | **Fila** (Web × Local, colunas de todas as etapas, cor por cliente) | Técnica | Item percorre Triagem → … → Expedição na fila; cor por cliente visível |
| S1.9 | **OS automática** (sem valores na visão do técnico) | Técnica | OS criada no recebimento; técnico **não vê** preço |

### Qui 16/jul — Conferência fina e Comunicação
| Sessão | Módulo | Quem treina | Teste / critério de aceite |
|---|---|---|---|
| S1.10 | **Conferência fina / bipagem** (trava de finalização) | Técnica, Expedição | Bipar 9 de 10 → OS vermelha, **não avança**; completar ou justificar → avança |
| S1.11 | **Motivos / ocorrências por setor** (mensagens pré-prontas) | Célio (cadastro), todos (uso) | Registrar "amostra faltante" → cliente recebe e-mail + entra no histórico da OS |
| S1.12 | **Notificação de pronto + liberação parcial** | Expedição | Ao mover p/ Expedição, cliente recebe e-mail; liberação parcial envia msg correta |
| S1.13 | **Histórico/log de comunicação na OS** | Recepção | Abrir a OS e ver todo o histórico (quem, quando, texto) |

### Sex 17/jul — Financeiro, Portal e Perfis
| Sessão | Módulo | Quem treina | Teste / critério de aceite |
|---|---|---|---|
| S1.14 | **Fechamento mensal** + **relatório detalhado** por serviço | Célio | Fechamento por cliente (bruto/adiantado/a faturar/crédito); discriminação por serviço |
| S1.15 | **Crédito pré-pago / extrato** | Célio | Registrar crédito, dar baixa, ver saldo no fechamento |
| S1.16 | **Cobrança** (Cora / programada) — *se credenciais ativas* | Célio | Gerar boleto/Pix; marcar cliente p/ faturamento automático no dia X |
| S1.17 | **Portal do cliente** (pedidos, 2ª via, laudos, saldo) | Célio, Recepção | Abrir o portal; cliente vê pedidos, 2ª via e laudos liberados |
| S1.18 | **Laudo por e-mail** | Célio, Recepção | Solicitar laudo → anexar PDF → liberar ao cliente |
| S1.19 | **Perfis de acesso** (técnico × gerência) | Jorge | Logar como técnico: telas com valor não aparecem; URL direta redireciona |

**Critério de saída da S1:** cada checklist de aceite marcado; time confortável
para operar seu módulo. **Simulação ponta a ponta** (1 pedido fictício do
recebimento à expedição + fechamento) executada com sucesso na sexta à tarde.

---

## 5. Semana 2 — Piloto em paralelo, 1 cliente (20–24/jul)

Primeiro cliente **real**: **Alquimipet**. Rodar **em paralelo** ao sistema antigo
(digitar nos dois) para segurança. Foco em validar o fluxo com dado de verdade.

| Dia | Atividade | Responsável |
|---|---|---|
| Seg 20 | Cadastrar cliente piloto + primeiro pedido real (orçamento) | Célio + Recepção |
| Ter 21 | Recebimento real → etiqueta → conferência de entrada | Recepção |
| Qua 22 | Item percorre a técnica (macro → processamento → corte → coloração) no rastreio | Técnica |
| Qui 23 | Conferência fina → notificação de pronto → expedição | Técnica + Expedição |
| Sex 24 | Fechamento/baixa do pedido piloto + revisão da semana (retro) | Célio + Jorge |

**Rotina diária do piloto:** reunião rápida de 15 min no fim do dia (Célio ↔ Jorge)
registrando o que travou e o que ajustar. Problemas pequenos entram no dia seguinte.

**Critério de saída da S2:** **1 pedido real** percorreu **todo** o fluxo
(orçamento → recebimento → etiqueta → técnica → conferência fina → expedição →
baixa) sem etapa faltando, com o cliente notificado por e-mail.

---

## 6. Semana 3 — Escala do piloto, 3 clientes (27–31/jul)

Escalar para **3 clientes** simultâneos. Aumenta volume e revela gargalos de
ritmo (a "rapidez na ponta" da recepção e macro).

| Foco | Objetivo |
|---|---|
| **Volume** | 3 clientes com pedidos em paralelo; fila com vários itens ao mesmo tempo |
| **Pendências** | Exercitar o relatório de pendências por cliente/setor; itens que "nunca voltam atrás" |
| **Comunicação real** | Ocorrências reais (faltou amostra, coloração a definir D+1) com e-mail ao cliente |
| **Financeiro** | Fechar o mês de 1 cliente com discriminação por serviço (base da NF) |
| **Refino** | Ajustar textos de Motivos, prazos e o que aparecer no uso real |

**Critério de saída da S3:** 3 clientes operando de ponta a ponta; pendências
sendo controladas pelo sistema; time operando **com autonomia** (suporte só para
exceções).

---

## 7. Semana 4 — Go-live pleno (03–07/ago)

Rotina do laboratório **100% no Histocell**. Parar de digitar no sistema antigo.

| Dia | Marco |
|---|---|
| Seg 03 | 🏫 **Visita 2 (presencial):** abertura do go-live no laboratório; toda entrada nova passa a ser **só** no Histocell, com suporte na sala |
| Ter–Qui | Operação normal monitorada (remoto); suporte de prontidão |
| Sex 07 | **Retro final** (online) + decisão formal de **desligar o sistema antigo** + lista de refinos pós-lançamento |

**Critério de go-live pleno:** um dia inteiro de rotina normal rodou apenas no
Histocell, sem necessidade de recorrer ao sistema antigo, e o financeiro fechou
corretamente.

---

## 8. Matriz de treinamento por papel (resumo)

| Módulo \ Papel | Recepção | Técnica | Expedição | Gerência (Célio) | Admin (Jorge) |
|---|:--:|:--:|:--:|:--:|:--:|
| Cadastro de cliente | ● | | | ●● | ○ |
| Recebimento + conferência entrada | ●● | ○ | | ○ | ○ |
| Etiquetas | ●● | ○ | | | ●● |
| Orçamento + prazo | ●● | | | ●● | |
| Rastreio + Fila | ○ | ●● | ● | ○ | ○ |
| OS (sem valores p/ técnico) | ○ | ●● | ● | ● | ○ |
| Conferência fina / bipagem | | ●● | ●● | ○ | |
| Motivos / ocorrências | ● | ● | ● | ●● (cadastro) | |
| Notificação de pronto / parcial | ○ | ○ | ●● | ○ | |
| Financeiro / fechamento / crédito | | | | ●● | ○ |
| Cobrança (Cora / programada) | | | | ●● | ● |
| Portal do cliente / laudos | ● | | | ●● | ○ |
| Perfis de acesso | | | | ○ | ●● |

`●●` responsável principal · `●` usa no dia a dia · `○` conhece / apoia

---

## 9. Materiais de apoio ao treinamento

- **Checklist de validação** por módulo — `checklist-deploy-lancamento.md`
  (usar como roteiro de teste em cada sessão da S1).
- **Fluxo do processo** — `fluxo-processo.png` / `.svg` (visão ponta a ponta para
  situar cada papel).
- **Resumo em linguagem do laboratório** — `resumo-semana-cliente.md`
  (o que cada função passou a fazer, sem jargão técnico).
- **Guia de deploy** — `DEPLOY-GUIDE.md` (referência do admin).
- Recomendado: gravar cada sessão da S1 (screencast) para consulta posterior e
  para treinar quem entrar depois.

---

## 10. Riscos e dependências

| Risco / dependência | Impacto | Mitigação |
|---|---|---|
| **E-mail (Resend) não configurado** | Trava Motivos, notificação de pronto e log | Resolver na **S0** (item 0.3) — bloqueia S1.11–S1.13 |
| **Impressora Zebra não instalada** | Recepção não emite etiqueta | Visita do Rod na **S0** (item 0.4) — bloqueia S1.4 |
| **Credenciais Cora ausentes** | Não emite boleto/Pix real | Não bloqueia go-live; cobrança entra quando chegarem (S1.16 opcional) |
| **Escopo dos "Motivos" cresce** | Treinamento vira discussão sem fim | Começar com conjunto fixo por setor; evoluir rodando |
| **Ritmo na ponta (recepção/macro)** | Lentidão no cadastro rápido | Validar busca por código exato na S1.5; ajustar na S3 |
| **Time inseguro para largar o antigo** | Adia o go-live | Paralelo real em S2–S3 dá confiança antes de desligar (S4) |

---

## 11. Definição de "implantação concluída"

- [ ] Ambiente em produção estável (API, admin, portal)
- [ ] E-mail funcionando; impressora instalada
- [ ] Todos os papéis treinados (matriz §8 coberta; checklists de aceite marcados)
- [ ] Piloto de 1 cliente ponta a ponta (S2) ✔
- [ ] Escala para 3 clientes (S3) ✔
- [ ] Rotina de um dia inteiro só no Histocell (S4) ✔
- [ ] Financeiro fechou corretamente no sistema novo
- [ ] Sistema antigo formalmente desligado
- [ ] Lista de refinos pós-lançamento registrada
