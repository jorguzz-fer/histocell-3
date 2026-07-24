# Homologação Célio — 4ª visita presencial (validação de fluxo)

Visita presencial ao laboratório para **rodar o fluxo ponta a ponta** com o Célio e
a equipe (Laiane, Clarinha e time técnico). Balanço geral: **estamos indo bem** — o
fluxo de rotina (recebimento → fila → rastreio → sala técnica → expedição) foi
percorrido e validado com casos reais. Abaixo, o que foi **validado** e as
**melhorias/ajustes** levantados durante a visita, organizados por área e
priorizados.

> Fonte: gravação da visita (`visita4.txt`). Itens marcados 🐞 são defeitos a
> corrigir; 🆕 são novas funcionalidades/config; 🔧 são ajustes em telas existentes.

---

## ✅ Validado na visita (funciona e agradou)

- **Recebimento com registro de recipientes** (pote/caixa/saco/bloco + adicionar mais itens) — fluido, "jogo rápido", não toma o tempo do motoboy/cliente.
- **Etiquetagem do recipiente** na recepção antes de seguir para a sala técnica.
- **Fila por setor** com entrada por último e atendimento de cima para baixo.
- **Avatar + cor por cliente** na fila (1ª letra do nome + cor fixa) — Célio destacou como **muito importante** para "bater o olho" e agrupar (ex.: todos os verdes = Célio).
- **Bipar o item em qualquer setor** para saber onde ele está.
- **Rastreio/kanban** — a visão foi considerada melhor e mais fácil.

---

## 🆕 Serviços de logística/transporte (criar agora)

Separar o **transporte** como serviço próprio no menu, na categoria **Logística**.
Código automático, **sem variante**, **sem prazo** (o prazo é o combinado do serviço).

| Serviço | Categoria | Valor (rotina = pesquisa) | Observação |
|---|---|---|---|
| **Entrega motoboy (capital)** | Logística | R$ 25 | |
| **Retirada motoboy (capital)** | Logística | R$ 25 | mesmo preço, sentido oposto |
| **Entrega motoboy (ABCD)** | Logística | R$ 30 | região ABC — outro preço |
| **Retirada motoboy (ABCD)** | Logística | R$ 30 | |

- Precisa **especificar retirada × entrega** (são dois sentidos; cliente pode pagar os dois: R$25 + R$25). Modelado como **dois serviços** (retirada e entrega) — simples e explícito.
- Outras modalidades citadas a considerar depois: **Correio**, **presencial**, **transportadora**.
- Rotina e pesquisa pagam **o mesmo** no transporte.

---

## 🆕 Novos departamentos/setores do fluxo

Surgiram setores que o fluxo real exige além dos atuais. Criar como departamentos
próprios (com identificação e possibilidade de conferência isolada):

1. **Imunofluorescência (IF)** — caso específico que "vai só pra lá, termina e sai". Evita misturar na sala técnica geral e facilita a conferência (vai direto ao setor).
2. **Arquivamento** — peças que chegam **só para arquivar** (cobra mais). É preciso um fluxo/serviço de arquivamento.
3. **Descarte** — produtos que chegam **para descarte**; importante **registrar o que foi descartado**.

> Padrão observado: "vão surgindo situações" — o software precisa **suportar
> adicionar novos departamentos** com facilidade (é esperado criar mais).

---

## 🔧 Recebimento / conferência de entrada

- **🐞/⚠️ Item "trava" após entrar no fluxo:** depois de registrada a entrada e o item ir para a fila, **não dá para editar/corrigir**. Célio levantou o risco de erro da recepção (ex.: esqueceu um bloco dentro da caixa). Definir **política de correção** (quem pode corrigir, até quando, com registro) — hoje não há caminho de correção.
- **Conferência serviços × amostras:** caso real observado — **6 serviços para 5 amostras** porque um paciente (Caroline) tinha **2 serviços** (imunofluorescência + pesquisa/"4D"). O sistema deve **ajudar a conferir** serviços contra amostras e sinalizar a divergência aparente (que não era erro).
- **Encaminhamento pós-verificação:** após a verificação, poder **mandar o item para um departamento específico** (com identificação). Hoje esse campo/ação ainda não existe na entrada — avaliar adicioná-lo.
- **Caixas retornáveis:** material que **não se lança** (embalagem do cliente) — apenas devolve; registrar o recipiente sem gerar cobrança.
- **Rotina sem orçamento:** parte do material de rotina chega **sem orçamento** (é lançado como rotina).

---

## 🔧 Fila / rastreio

- **🐞 Rastreio do pedido não atualiza (BUG — Fernando reconheceu):** os itens **correm na fila**, mas **no rastreio do pedido não estão entrando**. Corrigir a sincronização fila → rastreio do pedido (ao ligar para o cliente/consultar o pedido, o rastreio precisa refletir o andamento real).
- **🆕 Kanban vertical (opção):** oferecer a opção de exibir as barras **na vertical** (em vez de empilhadas na horizontal) para ver todas de uma vez; com opção de **ordenar por quem chegou primeiro**.
- **Avançar/encaminhar entre setores:** validado que dá para simular e mover o item entre departamentos (macro, processamento/inclusão, microtomia/corte, coloração, laudo, finalização, expedição) — incluir os novos (IF, arquivamento, descarte).

---

## 🔧 Sala técnica / Ordem de Serviço

Ponto mais denso ("aí que segue a nova luta"): quando o item chega na fila da sala
técnica/microscopia, a técnica precisa entender **o que fazer**.

- **Tela do item na sala técnica (adequar a tela de rastreio para os técnicos):** ao bipar/clicar no item, abrir uma tela com **cliente**, **serviços solicitados** (o que foi no orçamento), **quantidades** (ex.: "10 processamento H&E") e **instruções**.
- **Indicar quantos pacotes/itens:** deixar claro se é **1 pacote** ou vários — senão a técnica trabalha tudo "em cima de um" e fica incompleto. **Cada etiqueta precisa de uma baixa** (bipar) para entrar no cliente.
- **Histórico/anexos do pedido:** incluir **a 1ª fotografia** que veio junto, **instruções escritas à mão** do cliente e materiais/folhas que acompanharam a amostra.
- **Impressão da OS:** para a parte técnica a **OS precisa ser impressa** (não basta ver na tela).
- **Uso em tablet/celular:** a tela funciona no **monitor** ou em **tablet/celular** — preferência por **tablet** na sala. A técnica vê a **fila de execução** e a **OS**, e pode fotografar com o celular para subir à IA.

---

## 🔧 Portal do cliente

- Nos **últimos pedidos/orçamentos solicitados**, permitir **abrir em detalhes** quais **itens** foram pedidos (o cliente precisa saber exatamente o que está pedindo — ex.: coloração de HE, Alcian Blue).

---

## 🔵 IA / visão computacional (feature maior — direção futura)

Desejo forte do Célio, tratado como evolução (pré-lançamento pode ficar sem):

- **Câmera/IA identifica o conteúdo do pacote** no recebimento/macro: abre-se o material num "tapetinho", a câmera identifica o que há dentro (potes, blocos, tubos).
- **Pré-lançamento por foto:** a técnica fotografa (celular/tablet), a IA **identifica e pré-lança** as amostras/serviços (contador de amostras, como na imagem de referência).
- **Botão de automação:** um botão que a técnica aperta → a IA **lê e joga** para uma **pasta com o nome do cliente**, sem precisar entrar no computador e procurar.
- A IA "aprende com os exemplos": quanto mais imagens enviadas, melhor identifica.

> Escopo grande — manter como **Fase 2** (alinhado com `spec-fase-piloto.md` §3).
> Não bloqueia o go-live.

---

## 🎯 Prioridades sugeridas (a confirmar com o Célio)

**Rápidas / config (dá para fazer já):**
1. Cadastrar os **serviços de logística** (motoboy capital/ABCD, retirada/entrega).
2. Criar os **departamentos** IF, arquivamento e descarte.
3. **Kanban vertical** (opção de visualização).

**Correções (curto prazo):**
4. **🐞 Sincronizar rastreio do pedido com a fila** (bug reconhecido).
5. Definir **política de correção** do recebimento após entrada.

**Telas / fluxo (médio):**
6. **Tela da sala técnica** com serviços/quantidades/instruções + nº de pacotes + baixa por etiqueta.
7. **Impressão da OS** para a técnica.
8. **Detalhe de itens** nos pedidos do portal do cliente.
9. Histórico do pedido com **1ª foto + instruções manuscritas**.

**Fase 2:**
10. **IA/visão** (identificação e pré-lançamento por foto).

---

## ✅ Status de implementação (o que já foi entregue)

Implementado nesta rodada (validar em produção durante o piloto):

- ✅ **Serviços de logística** — motoboy Capital (R$25) e ABCD (R$30), retirada e entrega, categoria Logística, sem etiqueta. Criados via seed idempotente (rodam no deploy).
- ✅ **Novos departamentos** — Imunofluorescência, Finalização, Arquivamento e Descarte adicionados ao rastreio; Arquivamento e Descarte são **terminais** (concluem o item na saída).
- ✅ **Departamentos na Fila + "Mover para"** — a Fila passou a exibir Imunofluorescência, Arquivamento e Descarte como colunas. Cada item ganhou a ação **"Mover para"** (roteia para qualquer departamento, fora do avanço linear); mover para Arquivamento/Descarte **conclui a OS**, e essas colunas mostram os itens já arquivados/descartados.
- ✅ **🐞 Bug fila→rastreio** — ao avançar a OS na Fila, o rastreio das etiquetas do pedido passa a ser sincronizado automaticamente (posição do material acompanha o andamento mesmo sem scan físico).
- ✅ **Kanban vertical** — alternador de layout na Fila (barras empilhadas × colunas lado a lado), com a preferência salva no navegador.
- ✅ **Detalhe de itens no portal do cliente** — "Ver itens" abre os serviços solicitados (código, nome, quantidade, subtotal) de cada pedido.
- ✅ **Impressão / acesso à OS** — botão "Ver / imprimir OS" na lista de Ordens e link "Ver OS / serviços" no quadro do rastreio do departamento, abrindo a OS imprimível (serviços + quantidades, **sem valores**).

Ainda em aberto (precisam de definição com o time / maior escopo):

- ⏳ **Tela da sala técnica** dedicada (nº de pacotes, baixa por etiqueta, instruções) — o Célio pediu para adequar a tela junto com a equipe.
- ⏳ **Política de correção** do recebimento após o item entrar no fluxo.
- ⏳ **Histórico do pedido** com 1ª foto + instruções manuscritas.
- 🔵 **IA/visão** (Fase 2).

---

## Próximos encontros
- Continuação **amanhã** (jogo rápido, pode ser com a Laiane) e possivelmente **sábado à noite** (após 18h) para avançar os ajustes de tela.
