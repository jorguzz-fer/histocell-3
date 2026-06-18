# Spec — Fase Piloto (Go-Live)

> Base: reunião Kleber × Célio × Fernando/Jorge (17/06/2026).
> Objetivo desta fase: **colocar o sistema para rodar em produção com 1 cliente piloto**
> (escalando para 3), em paralelo ao sistema antigo por ~15 dias, validando o fluxo
> operacional ponta a ponta (recepção → macro → técnica → expedição → cobrança).

---

## 1. Princípios acordados na reunião

1. **Casamento código → serviço deve ser 1:1.** Digitou o código, traz **só** aquele serviço. Nada de "digitei 1 e veio tudo que contém 1".
2. **O item nunca volta um passo atrás.** Quem está com o item resolve o problema dele (ex.: faltou definição de coloração → o item espera com o responsável atual até o cliente informar).
3. **Todos os dados são editáveis**, principalmente **observações** — por recepção **ou** técnico (quem for responsável pelo item).
4. **Rapidez na ponta** (recepção e macro): sem ficar rolando mouse/procurando. Código primeiro; nome/categoria como apoio.
5. **Rodar para aprender**: colocar em operação, ir ajustando os problemas conforme aparecem. Piloto em paralelo ao sistema antigo.

---

## 2. Épicos da fase

### 🔴 E1 — Renumeração sequencial de serviços + busca por código exato  *(BLOQUEANTE — pré-requisito do go-live)*

**Problema:** os códigos atuais vêm do legado, sem lógica. A busca hoje é por *substring* (digitar "1" lista tudo que contém "1"), o que trava o cadastro rápido.

**Decisão da reunião:**
- Criar **numeração sequencial nova** para todo o portfólio (ex.: 1…N), sem repetição.
- Jorge gera a partir da **ordem alfabética**, numerando de 1 até o último.
- Convenção de faixas sugerida (a confirmar — ver §5):
  - **1–10**: serviços carro-chefe / mais usados (ex.: HE = 1).
  - **500+**: colorações específicas.
  - **700+**: imuno-histoquímica / painéis (anticorpo em si é caso à parte; numeração segue a lógica do anticorpo proposto).
- O formulário do cliente (impresso/eletrônico) passa a exibir **o código novo**; ao chegar, recepção digita o código e o sistema casa direto.

**Requisitos funcionais:**
- [ ] Script/rotina de **renumeração** dos serviços ativos (gera `codigo` sequencial; preserva `codigoLegado` para referência/auditoria).
- [ ] Busca por código com **match exato prioritário**: digitou um número → retorna **somente** o serviço daquele código (se existir), em vez de substring.
- [ ] Quando o termo é numérico, **ordenar do menor para o maior**.
- [ ] Busca por **nome** e por **categoria** mantidas como apoio.
- [ ] Vale para a aba **Legado** e para os seletores de serviço (`CatalogoTabs`, busca rápida).

**Critérios de aceite:**
- Digitar `1` no campo de código seleciona/destaca apenas o serviço de código `1`.
- Digitar `42` não traz `142`, `420`, etc. como resultado principal.
- Lista numérica exibida em ordem crescente.

---

### 🟠 E2 — Enxugar bases e cadastro controlado de clientes

**Serviços:**
- [ ] Manter ferramenta de **arquivar/excluir** serviço (já existe na aba Legado — ✅) e cadastrar os **~10 serviços mais usados** primeiro.
- [ ] Permitir **criar novo serviço** rápido informando o código novo (área de cadastro rápido).

**Clientes:**
- [ ] **Não** subir toda a base automaticamente. Célio cadastra **com cautela** (há clientes no sistema antigo).
- [ ] **Limpar os 5 clientes fictícios** atuais.
- [ ] Começar com **1 cliente piloto (Alquimipet / "Alqui­mipet")** e escalar para **3**.
- [ ] (Opcional) importação assistida da base real, sob demanda do Célio.

---

### 🟢 E3 — Fluxo operacional + rastreabilidade  *(base já entregue nesta fase ✅)*

Já entregue: **emissão de etiquetas a partir do pedido**, **rastreio por departamento via código de barras** (entrada/saída, painel de fila por setor, modo TV, timeline). Ajustes desta fase:

- [ ] **Digitação na Sala de Macro:** a digitação/identificação das amostras pode ocorrer na macroscopia (não precisa voltar à recepção). Requer estação (teclado) no setor — já suportado pelo painel `/rastreio/departamento/macroscopia` e telas de pedido.
- [ ] **Recepção etiqueta a lâmina** antes de encaminhar à sala técnica (puxar a etiquetagem para a recepção). Fluxo de etiquetas já cobre isso.
- [ ] **Edição por responsável:** recepção **ou** técnico podem editar dados/observações do item a qualquer momento.
- [ ] **"Nunca volta atrás":** itens sem definição (ex.: 5 de 20 sem coloração definida) permanecem com o responsável atual, sem retroceder etapa, até o cliente informar (e-mail/WhatsApp, normalmente D+1).
- [ ] **Colorações específicas:** recepção lança quando o cliente envia (posteriormente, por e-mail/WhatsApp); regra entra no dia seguinte sobre o e-mail.

**Critério de aceite:** dá para saber, a qualquer momento, **em que setor cada lâmina/cassete está** e quem é o responsável.

---

### 🟠 E4 — Orçamento → Recebimento → Baixa (conferência vs. orçamento)

**Fluxo:** cliente envia pedido por e-mail (ex.: "50 AE1, 50 maçã, 100 lâminas silanizadas") → recepção monta **orçamento** no sistema → cliente traz as amostras → **contagem confere** com o orçamento → lança.

**Requisitos:**
- [ ] Recepção identifica a amostra macro (ex.: "1 pote + 2 blocos"; "pote com 20 amostras") e registra a contagem.
- [ ] **Conferência contra o orçamento**: comparar o que chegou com o que foi orçado.
- [ ] **Detectar excedente**: orçou 20, vieram 22 → registra **observação automática para cobrança** (amostras além do orçamento) e sinaliza eventual ajuste de orçamento.
- [ ] **Baixa** pelo total real (ex.: 22), refletindo na cobrança.
- [ ] Vincular **Orçamento ↔ Pedido/Recebimento** (rastrear qual orçamento originou o recebimento).

**Já existe no modelo:** `Orcamento`, `ItemOrcamento`, `Pedido`, `Amostra`, módulo de Recebimento. Falta o **vínculo orçamento→recebimento** e a **detecção de excedente**.

---

### 🟠 E5 — Observações / canal interno + Ordem de Serviço sem valores

**Decisões:**
- [ ] Campo de **observação / sinalização no cadastro do PEDIDO** (cada pedido tem código único): marcar **"urgente"**, **"pagamento adiantado"**, e observações livres. Editável por recepção/técnico.
- [ ] Esses dados **não aparecem para o cliente final**.
- [ ] Possibilidade de observação também no **cadastro do cliente** (ex.: "este cliente paga antecipado/urgência") — canal interno Célio↔Jorge.
- [ ] **Ordem de Serviço (OS) é operacional**: para o colaborador e o financeiro contém **nº do serviço e o que fazer**, **sem valores/preço**.

**Já existe:** `Pedido.observacoes`, módulo de OS (`OrdemServico`/`EtapaOS`). Falta os **flags (urgente/pago)** no pedido e garantir **OS sem valores** na visão do técnico.

---

### 🟡 E6 — Crédito pré-pago + extrato do cliente

**Problema:** clientes pagam adiantado (ex.: NF de R$1.000 para usar no ano — comum em pesquisa). Hoje o Célio controla manualmente e é pressionado por extratos.

**Requisitos:**
- [ ] Registrar **crédito pré-pago** por cliente e **debitar** conforme consumo.
- [ ] Mostrar **saldo** ao dar baixa/fechar o mês.
- [ ] **Extrato** (consumido / saldo) — no relatório financeiro mensal.
- [ ] **(Fase 2 desejável)** **tela do cliente** no portal com saldo/consumo em **tempo real**.

**Já existe no modelo:** `CreditoPrePago`. Falta a **lógica de débito + UI/extrato** (e depois o portal).

---

### 🟡 E7 — Pacotes / Painéis (validar + código)

- [ ] Pacote = combinação de serviços (ex.: **processamento + corte + coloração**) — deve aparecer nas categorias relevantes (coloração **e** corte), pois contém os dois serviços.
- [ ] Pacote serve para **imuno (painéis)**: "produto pronto" / painel fechado já classificado.
- [ ] **Cada pacote/produto precisa de código** (na nova numeração).

**Já existe:** módulo `Pacote`/`PacoteItem` e aba **Pacotes**. Falta alinhar **código** e **categorização cruzada**.

---

## 3. Fase 2 (explicitamente adiada)

- 🔵 **IA com imagem** para conferência/liberação da amostra de forma mais fácil.
- 🔵 **Portal do cliente** completo (saldo de crédito em tempo real, acompanhamento). Hoje os portais `pedidos`/`laudos` são stubs.

---

## 4. Plano de piloto / rollout

1. **Renumerar os códigos** (E1) — Jorge faz primeiro.
2. **Limpar clientes fictícios**; cadastrar **1 cliente piloto (Alquimipet)**.
3. Cadastrar **1 pedido** e percorrer **todo o processo** (orçamento → recebimento → etiqueta → macro → técnica → expedição → baixa).
4. Rodar **em paralelo ao sistema antigo** (~15 dias), digitando nos dois.
5. Escalar para **3 clientes**.
6. Ajustar conforme os problemas reais aparecem (canal direto Célio↔Jorge).

---

## 5. Decisões pendentes (confirmar antes de codar)

1. **Esquema de numeração:** sequencial puro `1…N` (alfabético) **vs.** faixas reservadas (1–10 carro-chefe, 500+ colorações, 700+ imuno). A reunião oscilou entre os dois. **Qual vale?**
2. **Renumeração:** aplica em **todos** os serviços ativos de uma vez? Mantemos `codigoLegado` visível para transição? Há formulário impresso já em uso com códigos antigos que precise de período de convivência?
3. **Excedente de amostras:** a observação para cobrança é **automática** (sistema detecta qtd recebida > orçada) ou **manual** (recepção marca)?
4. **Flags do pedido:** além de "urgente" e "pagamento adiantado", quais outros sinalizadores?
5. **Crédito pré-pago:** entra **já no piloto** (débito + extrato no fechamento) ou fica para logo após?

---

## 6. Mapa: já existe ✅ vs. a construir 🔨

| Item | Status |
|---|---|
| Emissão de etiquetas a partir do pedido | ✅ entregue |
| Código de barras = número impresso + scan por número | ✅ entregue |
| Rastreio por departamento (entrada/saída, fila, TV, timeline) | ✅ entregue |
| Pedido Legado com abas (Populares/Favoritos/…/Pacotes/Guiado/Clínico) | ✅ entregue |
| Arquivar/excluir serviço | ✅ existe |
| Pacotes (combos) | ✅ existe (alinhar código/categoria) |
| **Renumeração sequencial + busca por código exato** | 🔨 **E1 (bloqueante)** |
| Limpar fictícios + cadastrar cliente piloto | 🔨 E2 |
| Conferência vs. orçamento + detecção de excedente + baixa | 🔨 E4 |
| Flags do pedido (urgente/pago) + obs. interna; OS sem valores | 🔨 E5 |
| Crédito pré-pago (débito + extrato) | 🔨 E6 |
| IA por imagem; portal do cliente em tempo real | 🔵 Fase 2 |
