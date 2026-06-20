# Fluxo do Processo — Histocell

Passo a passo, do pedido à expedição. (Imagem: `fluxo-processo.svg`.)

```mermaid
flowchart TD
    A[1. PEDIDO<br/>Cliente Portal Web ou Recepção Local<br/>serviços + observações nº dos casos] --> B
    B[2. RECEBIMENTO · Etapa 1 — RECEPÇÃO<br/>registra recipientes Pote/Caixa/Saco/Outro<br/>sem abrir/contar · etiqueta o recipiente · grava dataRecepcao] --> C
    C[3. RECEBIMENTO · Etapa 2 — LABORATÓRIO<br/>designa amostras nº Histocell<br/>conferência previsto×recebido → excedente<br/>lança serviços · grava dataRecebimento] --> D
    D[4. ETIQUETAS<br/>gera/imprime Code128 por lâmina/cassete] --> E
    E[5. RASTREIO POR DEPARTAMENTO scan<br/>Entrada/Saída · progresso · responsável · tempo]
    E --> R1[Recepção/Conferência] --> R2[Macroscopia] --> R3[Processamento/Inclusão] --> R4[Microtomia Corte] --> R5[Coloração/Montagem] --> R6[Laudo] --> R7[Expedição]
    R7 --> F[6. EXPEDIÇÃO / CONCLUÍDO]

    %% laterais
    C -. abate crédito / sinaliza excedente .-> FIN[Financeiro<br/>crédito pré-pago + cobrança]
    A -. acompanha sem login .-> CLI[Cliente Portal<br/>saldo · histórico · status · contato]
    E -. carimbo de tempo por etapa .-> REL[Relatório de tempos<br/>criado→recepção→laboratório→processado→despachado]
```

## Etapas
1. **Pedido** — cliente (Portal Web, link sem login) ou recepção (local). Serviços + observações (nº dos casos do cliente).
2. **Recebimento · Recepção** — registra o que chegou em recipientes (Pote/Caixa/Saco/Outro), sem abrir nem contar amostras; etiqueta o recipiente. *(dataRecepcao)*
3. **Recebimento · Laboratório** — designa as amostras (nº Histocell), confere previsto×recebido (excedente → cobrança), lança os serviços. *(dataRecebimento)*
4. **Etiquetas** — gera e imprime a etiqueta Code128 por lâmina/cassete (nº impresso = nº do código de barras).
5. **Rastreio por departamento (scan)** — a peça anda escaneando Entrada/Saída em cada setor: Recepção/Conferência → Macroscopia → Processamento/Inclusão → Microtomia → Coloração/Montagem → Laudo → Expedição. Barra de progresso + responsável + tempo por etapa.
6. **Expedição / Concluído** — a saída da Expedição encerra a peça.

**Transversais:** Financeiro (crédito pré-pago abatido no recebimento; excedente sinalizado), Cliente (portal: saldo, histórico, status, contato), Relatório de tempos (carimbos por etapa, a partir dos scans).
