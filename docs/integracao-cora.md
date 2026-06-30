# Integração de cobrança — Banco Cora

Análise da API do Cora para emissão de **boleto** + **Pix** e **NFS-e** (nota fiscal de serviço), e o que depende do lado do Histocell para habilitar.

## Como a API funciona (resumo técnico)

**Autenticação: OAuth2 `client_credentials` + mTLS (certificado).**
- A cada requisição usa-se um **access token** (Bearer) **junto com um certificado + chave privada** (mTLS).
- Endpoint de token (stage): `POST https://matls-clients.api.stage.cora.com.br/token`
  com `grant_type=client_credentials&client_id=<SEU_CLIENT_ID>` + o certificado/chave na conexão TLS.
- **Produção** tem URL base e credenciais **distintas** das de stage.

**Emissão de boleto registrado (v2):**
- `POST https://matls-clients.api.stage.cora.com.br/v2/invoices`
- Headers: `Authorization: Bearer <token>` + `Idempotency-Key: <uuid>` (evita boleto duplicado) + mTLS.
- Corpo (campos principais): `code` (nosso identificador), `customer` (pagador: nome, documento, e‑mail, endereço), `services` (itens: nome + valor), `payment_terms` (vencimento `due_date`), e opcionais `fine`/`interest`/`discount` (multa/juros/desconto) e `notifications`.
- Retorno: id do boleto, status, **linha digitável**, **código de barras**, **QR Code Pix** e **URL do PDF**.
- Também há **carnê (parcelado)** até 24x.

**Webhooks:** a Cora notifica nosso sistema quando o boleto é **pago** (e outras mudanças). Precisamos expor uma **URL pública HTTPS** e registrar o webhook.

**Nota fiscal:** o Cora emite **NFS‑e (Nota Fiscal de Serviço)** — que é o tipo certo para o laboratório (serviço), **não** NFe de produto. A NFS‑e pode ser **emitida junto com o boleto/no pagamento**. Custo aprox.: R$0,49 (Cora Pro) ou R$0,99 por NFS‑e.

---

## ✅ O que depende de VOCÊ (Histocell)

1. **Conta Cora PJ ativa** (e, p/ NFS‑e mais barata, avaliar o **Cora Pro**).
2. **Habilitar a Integração Direta (API)** na conta:
   - Conta → **Integrações via APIs** → **Acessar Integração Direta** → aceitar os Termos de APIs.
3. **Enviar as credenciais** (idealmente de **stage** primeiro, p/ testar; depois **produção**):
   - `client_id`
   - **certificado** (arquivo)
   - **chave privada** (arquivo)
   - ⚠️ São **dois conjuntos** (stage e produção) — preciso de cada um do ambiente correspondente.
   - 🔒 Me envie por canal seguro; eu guardo como **secret** no Coolify (não vai pro código/repositório).
4. **Configurar a NFS‑e na Cora** (se quiser nota automática):
   - cadastro/login no município, **certificado digital e‑CNPJ** (se o município exigir), **regime tributário**, **código do serviço (item da lista/CNAE)** e **alíquota de ISS**. Isso é feito no painel da Cora.
   - Definir: emite NFS‑e **no ato da cobrança** ou **no pagamento**?
5. **Dados do emissor** (vão no boleto/NFS‑e): razão social, CNPJ, endereço, e‑mail. (Confirmar os dados do laboratório.)
6. **Regras de cobrança** (decisões de negócio):
   - prazo de **vencimento** padrão (ex.: 15 dias);
   - **multa/juros** por atraso (ex.: 2% + 1% a.m.) e **desconto** (se houver);
   - instruções do boleto;
   - o que vai na **discriminação da NFS‑e** — aqui entra o que o Célio pediu: **linha a linha para pesquisa** (ex.: "20 H&E …") e o **nº do projeto (FAPESP)** dos pesquisadores; descrição simples para rotina.

---

## 🔧 O que faço do lado do sistema (quando tiver as credenciais de stage)

1. **Módulo `cobranca`** no backend:
   - cliente HTTP com **mTLS** (Node `https.Agent` com cert/key) + cache do token.
   - `gerarBoleto(pedido/fatura)` → cria invoice na Cora, salva id/linha digitável/PDF/Pix.
   - **webhook** `POST /cobranca/webhook/cora` → marca a fatura como paga e (se ativo) dispara a NFS‑e.
   - emissão de **NFS‑e** com a discriminação (pesquisa = linha a linha + projeto; rotina = simples).
2. **Fechamento mensal** (já existe a tela) ganha botão **"Gerar cobrança"** por cliente → boleto + NFS‑e, com envio ao e‑mail financeiro do cliente.
3. **Portal do cliente**: 2ª via do boleto / Pix / status de pagamento.
4. Segredos (`CORA_CLIENT_ID`, `CORA_CERT`, `CORA_KEY`, `CORA_BASE_URL`, `CORA_ENV`) via Coolify.

> Observação técnica: o sandbox de desenvolvimento **bloqueia o domínio do Cora** (rede restrita), então a integração real será testada **em stage com as credenciais**, validando ponta a ponta antes de produção.

## ✅ Status: módulo implementado (aguardando credenciais)

O código já está pronto e roda sem credenciais (até lá, "Gerar cobrança" cria a fatura e o boleto fica pendente):
- **`src/cobranca`** — `CoraClient` (mTLS + token via `https` nativo), `CobrancaService` (criar fatura do mês, emitir boleto, sincronizar, webhook), `CobrancaController`.
- **Webhook público**: `POST /cobranca/webhook/cora` (sem JWT) — registrar essa URL na Cora.
- **Financeiro → Fechamento mensal**: botão **"Gerar cobrança"** por cliente + indicador de Cora configurada.
- **Portal do cliente**: seção **"Minhas faturas"** (2ª via: baixar boleto, copiar linha digitável/Pix).
- Migração `20260625140000_fatura_cobranca_cora` (campos do boleto na Fatura).

### Variáveis de ambiente (secrets no Coolify)
```
CORA_ENV=stage              # stage | production
CORA_CLIENT_ID=...          # client id da Integração Direta
CORA_CERT=<PEM ou base64>   # certificado
CORA_KEY=<PEM ou base64>    # chave privada
# opcionais:
CORA_BASE_URL=...           # sobrescreve a URL base
CORA_MULTA_PCT=2            # multa (%) por atraso
CORA_JUROS_MES_PCT=1        # juros (% a.m.)
```
Webhook a registrar na Cora: `https://<api-publica>/cobranca/webhook/cora`

> ⚠️ Confirmar contra o stage: os **nomes exatos** dos campos do corpo do boleto v2 e do retorno (linha digitável/PDF/Pix). O código já tem fallbacks, mas ajusto fino quando rodar em stage.

## Ordem sugerida
1. Você habilita a API + me manda as **credenciais de stage**.
2. Eu construo o módulo e testo emissão de boleto + webhook em **stage**.
3. Validamos a **NFS‑e** (depende da config fiscal no painel Cora).
4. Trocamos para **produção** (credenciais de produção).

---
Fontes: developers.cora.com.br (Instruções iniciais, Client Credentials, Fluxos de Autorização, Emissão de boleto registrado v2), workspace Postman da Cora, cora.com.br/conta-pj/nota-fiscal.
