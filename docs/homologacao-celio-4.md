# Homologação Célio — 4ª sessão (fluxo OS / Macroscopia / Etiquetas)

Foco: como a **Ordem de Serviço (OS)** nasce do recebimento e guia o laboratório, e quando/como a etiqueta é impressa.

## Fluxo descrito pelo Célio (passo a passo)

1. **Chega o orçamento** → recepção faz o **Recebimento** (registra o pote/caixa/saco).
2. **Do recebimento, gera a OS automaticamente** ("ele já cria a OS direto").
3. A **OS lista todos os itens do orçamento** (ex.: 20 cassetes/blocos; se houver 2 colorações, são 2×20).
4. A **OS aparece na tela da Macroscopia** com a **quantidade prevista do orçamento** ao lado ("tivesse escrito o que eu vendi → 20 amostras"), para conferência.
5. O colaborador da macro **identifica/lança as 20 amostras** no sistema.
6. **A recepção imprime a OS + as etiquetas** depois que a macro lançou (a recepção acompanha na tela que foi lançado e que "bateu" com o orçamento).
7. Material segue: processamento (overnight) → inclusão → corte. A OS impressa anda junto.
8. **Conferência final por bipagem** das 20 amostras; se faltar, o sistema avisa.

## Requisitos concretos

| # | Requisito | Estado atual |
|---|---|---|
| A | **OS criada automaticamente no Recebimento** (recebimento → OS) | Entidade `OrdemServico` existe, mas **não** é criada no recebimento. **NOVO** |
| B | **Campo "gera etiqueta?" no cadastro do Serviço** (a gerência define; quando marcado, o sistema abre a impressão; quando não, não etiqueta) | **Não existe** no `Servico`. **NOVO** |
| C | **Tela da Macroscopia mostra a qtd prevista do orçamento** por item, para conferir | Conferência previsto×recebido existe no Recebimento, mas **não exposta por item na macro**. **PARCIAL** |
| D | **OS impressa com cliente + linha a linha de cada item** | Impressão de OS existe (`/imprimir/os/[id]`), **sem valores**. Confirmar que traz cliente + itens |
| E | **Recepção imprime OS + etiquetas após a macro lançar** | Emissão de etiquetas existe; falta o gatilho "macro lançou → recepção imprime" |
| F | **Conferência final por bipagem (avisa se faltar)** | Lógica de previsto×recebido + excedente já existe |
| G | **2 colorações → 2 etiquetas por amostra** (20 H&E + 20 LCB = 40) | Etiqueta por amostra/coloração já existe |

## ⚠️ Ponto a reconciliar (importante)

Numa conversa anterior **decidimos "matar a OS" e consolidar no Rastreio** (tiramos a OS do menu, mantivemos as barras de progresso). Agora o Célio descreve a **OS como um documento impresso** que nasce do recebimento e acompanha o material no laboratório.

Não é contraditório, mas precisa de uma definição:
- **OS = documento impresso** (folha de trabalho do técnico, com itens e identificação) → **precisa existir** (temos a impressão).
- **OS = acompanhamento de etapas** → isso virou o **Rastreio** (barras de progresso).

**Decisão necessária:** a OS volta a ser gerada/visível (auto a partir do recebimento, com impressão) e o Rastreio continua sendo o acompanhamento? Ou a "OS impressa" é só um botão de impressão dentro do fluxo de Recebimento/Rastreio, sem trazer o menu de OS de volta?

## Proposta de implementação (após sua confirmação)

1. **Servico.geraEtiqueta** (boolean, default true) + checkbox no cadastro do serviço. Filtra o que entra na impressão de etiquetas.
2. **Auto-criar a OS no Recebimento (etapa Laboratório)**: ao "receber", já cria a OS com os itens do orçamento (qtd prevista por item).
3. **Macroscopia**: mostrar, por item, a **qtd prevista** (do orçamento) ao lado do que foi lançado, com o alerta de divergência.
4. **OS impressa**: garantir cliente + linha a linha; imprimir junto com as etiquetas (gatilho na recepção após a macro lançar).
5. Conferência final por bipagem reaproveita o previsto×recebido.

## Itens que dependem de você
- Foto da **máscara de macroscopia** que o Célio usa (ele vai mandar) — para a OS impressa ficar no formato dele.
- Quais serviços **não** geram etiqueta (ex.: "caixa corta-lâmina") — ele vai marcando no cadastro.
