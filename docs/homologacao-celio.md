# Homologação com Célio — notas e fluxo (18/06)

Organização da homologação. Foco no **fluxo operacional** que o Célio descreveu
(do recebimento ao processo) e no que **falta** para rodar.

---

## 1. Itens já resolvidos na homologação ✅
- **Sessão expirando rápido** → token 12h.
- **Colorações específicas** sem nome ("Especificas") → 40 nomeadas (Giemsa, PAS…).
- **Insumos** sem nome ("Material") → 43 nomeados.
- **Seed revertendo edições/clientes a cada deploy** → seed agora é não-destrutivo.
- **Erro 500 ao salvar pedido** (numeração com buraco) → corrigido.
- **Crédito pré-pago** → lançamento, saldo, extrato, abatimento automático.
- **Desconto %** por cliente → ok.
- **idEtiqueta** do cliente aparece na etiqueta → ok.
- **Portal do cliente**: pedido sem login, vê só o valor final, campo de
  observação para o cliente colocar a numeração dos casos dele → ok.
- **Recebimento** separa **Portal (Web) × Local** → ok.

## 2. Ajustes pequenos pedidos (pendentes)
- [ ] **"Pedido Legado" → "Pedido"** e remover botão **Renumerar** (feito no código; falta deploy).
- [ ] **Recebimento:** remover campos **espécie / raça / cor** ("cassete fechado, não abro") — deixar só o que é pertinente.
- [ ] **Nome do serviço "01" (carro-chefe)**: hoje "HE Processamento inclusão + HE…". Célio quer renomear/representar como o **pacote** (processamento + HE, cassete identificado). Definir nome.
- [ ] **Terminologia Pedido × Orçamento × OS** — decidir (ver §4).
- [ ] **Visão do colaborador/técnico sem valores** (perfil de acesso).

---

## 3. 🔴 O FLUXO que o Célio descreveu (do recebimento ao processo)

> Esta é a parte central. Ele quer que o sistema siga exatamente esta lógica.

### Etapa 1 — Entrada da amostra (Recepção) — "primeiro contato / primeira recepção"
- O material chega por **motoboy / Sedex / Uber**.
- A recepção registra **o que chegou, em recipientes**, **sem ainda contar as amostras**:
  ex.: *"1 pote, 5 blocos, 2 seringas"*.
- **Não abre** material molhado/tóxico (formol). Só identifica o que é visível/fechado
  (bloco, seringa, caixinha). O conteúdo do pote é contado **depois, lá dentro**.
- Imprime/cola **etiqueta de identificação** em **cada recipiente** (pote, blocos,
  seringa) marcando que é do cliente (ex.: AlchemyPet).
- Encaminha "pra lá dentro" (macro / triagem).

### Etapa 2 — Conferência e identificação (dentro / sala de macro)
- Quem recebe lá dentro **escaneia ("pipa")** o recipiente → o sistema entra **naquele pote**.
- **Designa o pote em X amostras** (ex.: 20) — digita os números **ou o sistema gera o nº Histocell**.
- **Confere com o pedido/orçamento** (quantidade prevista × recebida).
- **Lança os serviços** conforme o que o cliente pediu:
  - veio pelo **link/portal** → já está no pedido;
  - veio por **papel/e-mail** → a pessoa digita os serviços (HE, coloração específica,
    "corte transversal com 2 cortes na lâmina", etc.).

### Etapa 3 — Processo (Técnica)
- Material pronto → **técnico processa** a amostra.
- No sistema fica disponível para a recepção: ela **imprime a etiqueta + a OS**
  (ordem de serviço, **sem valores**), **grampeia** e manda passar na **técnica**
  (que recebe na manhã seguinte).

### Etapa 4 — (demais etapas do fluxo analítico)
- A detalhar junto (corte, coloração, montagem, laudo, expedição) — já temos o
  **rastreio por departamento** pronto para isso.

---

## 4. Mapa: o que já temos × o que falta (por etapa)

| Etapa do fluxo (Célio) | Hoje no sistema | Falta |
|---|---|---|
| **1. Entrada bruta na recepção** (registrar pote/blocos/seringas, sem contar amostras) | Recebimento já existe, mas vai **direto para criar N amostras** (com espécie/material) | **Etapa de entrada por recipiente** (pote/bloco/seringa + quantidade), sem contagem de amostra; **etiqueta de identificação do recipiente** |
| **Tipos de recipiente** (pote, bloco, seringa, caixinha; molhado × seco) | Não modelado | Cadastrar/selecionar tipo de recipiente |
| **2. Designar pote → X amostras + nº Histocell** | ReceberDrawer cria amostras com nº interno + conferência prevista×recebida | Ligar à **etapa 1** (escanear recipiente → designar amostras); simplificar campos |
| **Lançar serviços (link ou papel)** | Pedido via portal **ou** local cobre os dois | ok (validar no fluxo real) |
| **3. Imprimir etiqueta + OS (sem valores), grampear, enviar à técnica** | Etiquetas (Code128) ✅; OS existe mas é **criada à mão** e **não há folha/impressão da OS** | **Folha de OS imprimível** (nº + serviços a fazer, sem valores) gerada no recebimento, junto com a etiqueta |
| **4. Corte/coloração/montagem/laudo/expedição** | **Rastreio por departamento** (scan, fila, TV) ✅ | Conectar a OS ao rastreio (opcional) |
| **Visão do colaborador sem valores** | OS não tem valores; admin vê tudo | **Perfil "técnico/colaborador"** com telas sem preço |
| **Orçamento → Pedido → OS** | Modelos existem (Orcamento, Pedido, OrdemServico) | **Definir terminologia e o encadeamento** (pedido vira orçamento? gera OS?) |

---

## 5. Decisões a alinhar com o Célio
1. **Recebimento em 1 ou 2 etapas?** (a) entrada bruta por recipiente na recepção e
   (b) contagem/designação das amostras na macro — **ou** manter em uma etapa só.
2. **Quais tipos de recipiente** entram no cadastro (pote, bloco, seringa, caixinha, lâmina…).
3. **Etiqueta de entrada** (identifica o recipiente do cliente) é diferente da
   etiqueta de lâmina? Como deve ser?
4. **OS impressa**: o que sai na folha (nº do caso, cliente, lista de serviços a fazer,
   sem valores) e em que momento é gerada.
5. **Pedido × Orçamento × OS**: nomes e quando um vira o outro.
6. **Perfil do colaborador** (o que ele vê / não vê — sem valores).

> Fernando vai **validar o fluxo inteiro simulado** e ir **presencialmente na semana
> que vem** para rodar junto. Amanhã à tarde: continuar o fluxo.
