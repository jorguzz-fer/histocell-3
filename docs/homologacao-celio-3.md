# Homologação com Célio — Check 3

Transcrição: `histocellreuniao3.txt`. Foco: **etiqueta em 2 níveis no recebimento**,
**ordem/nomes do menu**, **OS impressa**, **financeiro (cobrança mensal + Cora)** e
**relatório de tempos**.

---

## 1. Recebimento — etiqueta em 2 níveis (núcleo da reunião)

Célio detalhou que a etiqueta acontece em **dois momentos distintos**:

### Nível 1 — Recepção (Etapa 1)
- A recepção (ex.: Laiane) registra a **entrada** dizendo os **tipos e quantidades**
  de recipientes: pote, caixa, saco (ex.: "1 pote", "3 sacos", "1 caixa").
- **Nesse momento já tem que sair uma etiqueta do recipiente**, identificando-o com
  o cliente — para não precisar ficar manuseando/conferindo solto.
  - "esse pote precisa gerar etiqueta… pra identificar aqui com esse cliente".
- A peça (com a etiqueta do recipiente) segue para a 2ª etapa / laboratório.

### Nível 2 — Laboratório (Etapa 2)
- O laboratório (Célio corrigiu **macroscopia → microscopia**) **confere** se chegaram
  todos os recipientes do pedido (3 sacos + 1 caixa + 1 pote).
- Depois **designa o conteúdo de cada recipiente**: cada recipiente pode ter **várias
  amostras/casos**:
  - pote → "tem 20 cassetes" → lança a identificação dos **20 casos** (20 números/serviços);
  - cada saco → "tem 5" → **5 numerações, 5 serviços**;
  - caixa → idem (identifica o que tem dentro).
- A partir do lançamento dessa identificação, **gera-se a 2ª etiqueta** — uma por
  amostra/caso — que é **o que vira a lâmina** e sai impressa.

> Impacto técnico: hoje a Etapa 2 cria amostras "soltas" (lista `amostras` com
> `numeroCliente`). Para refletir o Célio falta **vincular amostra → recipiente**
> (`Amostra.recipienteId`) e, na UI da Etapa 2, designar **N amostras por recipiente**.
> A Etapa 1 precisa **emitir etiqueta do recipiente** (código próprio).

---

## 2. Ordem de Serviço (OS) — volta, agora impressa

- Célio tinha tirado a OS do menu; quer de volta como **passo/conceito**.
- **Quando gera:** no fim da Etapa 2, "quando você já identifica cada amostra".
- **Formato:** **física/impressa** — folha que o laboratório usa na sala de macro.
  "é física né, que eu vou precisar dela física".
- Sai **sem valores** (decisão das reuniões anteriores: folha operacional, sem preços).

---

## 3. Menu — ordem e nomes (alinhado à sequência do processo)

Célio quer o menu na **ordem do fluxo operacional**, começando pelo colaborador:

1. **Cliente** (Clientes) — primeiro passo.
2. **Recebimento** — "é o primeiro passo do colaborador: recebeu, chegou no laboratório".
3. **Orçamento** — Célio prefere renomear **"Pedido" → "Orçamento"**.
4. **Etiquetas**
5. **Ordem de Serviço** — gerada na Etapa 2.
6. **Rastreio**
7. **Relatório(s)** — estratégico (gestão) **e** operacional (tempos).
8. **Qualidade** — não usa hoje; **deixar quietinho lá embaixo**, implementar depois.
9. **Financeiro** — **por último**.

- **Dashboard:** "só gráfico, pra gestão". Decisão: **mostrar só para o perfil gestão**;
  outros perfis não veem (ou veem sem poder clicar).

---

## 4. Financeiro — cobrança mensal + crédito (secundário, mas mapeado)

- Crédito pré-pago já existe e Célio aprovou ("já tem uma coisa aí… é isso, eu preciso disso").
- **Fechamento mensal:** ao fechar o mês, o sistema deve, **por cliente** (ele tem ~200):
  - mostrar **o que consumiu no mês**, o **crédito/saldo** e o **quanto falta pagar**;
  - área de **extrato** por cliente (clica no cliente → ordens do mês + crédito + saldo).
- **Cobrança automática:** ao fechar, mandar **automaticamente** ao cliente (por **e-mail**)
  a **descrição do serviço** + **boleto** (com data de vencimento), **com ou sem nota fiscal**
  (clipezinho) — "se o sistema não fizer isso por mim… é automático".
- **Integração bancária:** banco é o **Cora** (boleto **+** nota fiscal). Não existe ainda —
  Fernando vai **estudar a documentação do Cora** (gerar boleto, vencimento, baixa de quem
  pagou/atrasou). **Não garantido para hoje**; financeiro é secundário, "começa do zero".

---

## 5. Relatório de tempos (operacional)

- A partir dos carimbos de cada etapa (já temos `dataRecepcao`, `dataRecebimento` e os
  scans de rastreio com responsável):
  - quanto tempo entre **chegou na recepção → término de cada etapa**;
  - **dia/hora** e **qual pessoa** fez cada etapa.
- Também um relatório "voltado ao cliente" explicando o que foi feito (futuro).

---

## 6. Backlog priorizado

### A — Implementar agora (alinhado, baixo risco)
- [ ] Menu: reordenar (Cliente → Recebimento → Orçamento → Etiquetas → OS → Rastreio →
      Relatórios → Qualidade → Financeiro) e **renomear "Pedido" → "Orçamento"** *(confirmar)*.
- [ ] Dashboard visível **só para gestão**.
- [ ] Etapa 1 (Recepção): **emitir etiqueta do recipiente** (pote/caixa/saco) com o cliente.
- [ ] Etapa 2 (Laboratório): **designar N amostras por recipiente** + gerar etiqueta por amostra.
- [ ] **OS impressa** (folha sem valores) gerada ao concluir a Etapa 2.

### B — Próximo (depende de modelagem/estudo)
- [ ] Relatório de tempos (criado → recepção → laboratório → processado → despachado, com responsável).
- [ ] Financeiro: tela de **fechamento mensal** (consumo + crédito + saldo + a pagar por cliente) + extrato.

### C — Estudo / externo
- [ ] Integração **Cora**: emissão de boleto + nota fiscal, vencimento, baixa automática, cobrança por e-mail.

### D — Adiado
- [ ] **Qualidade** (controle de qualidade interno) — não usa hoje; manter no rodapé.
