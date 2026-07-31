import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CryptoService } from '../common/crypto.service';
import { CoraClient } from './cora.client';

const cents = (v: number) => Math.round(v * 100);
const soDigitos = (s?: string | null) => (s ?? '').replace(/\D/g, '');

const INCLUDE = {
  cliente: { select: { id: true, nome: true, nomeFantasia: true } },
  itens: true,
} as const;

@Injectable()
export class CobrancaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('CobrancaService');
  private timer?: NodeJS.Timeout;
  private ultimoDiaRodado?: string; // 'YYYY-MM-DD' já processado (evita repetir no mesmo dia)

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private cora: CoraClient,
  ) {}

  // ── Agendador leve (sem dependência): verifica de hora em hora ───────────────
  onModuleInit() {
    this.timer = setInterval(() => {
      this.rodarAgendadas().catch((e) => this.logger.error(`Agendador de cobrança: ${e?.message}`));
    }, 60 * 60 * 1000); // a cada 1h
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Gera as cobranças programadas: para cada cliente com cobrancaAutomatica e
   * diaCobranca == hoje, fatura o MÊS ANTERIOR (fechado) — uma vez por dia.
   * Só age com a Cora configurada. Idempotente (pula faturas já existentes).
   */
  async rodarAgendadas(force = false) {
    const hoje = new Date();
    const dia = hoje.getDate();
    // Chave do dia em horário LOCAL (mesma base de getDate()), não UTC — evita
    // que a janela "vire" às 21h em servidores UTC-3 e pule/duplique execuções.
    const chaveDia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (!force && this.ultimoDiaRodado === chaveDia) return { ok: true, ja_rodou_hoje: true };
    if (!this.cora.isConfigured()) return { ok: false, motivo: 'Cora não configurada' };

    // mês anterior (fecha o mês passado)
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const periodo = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;

    const automaticos = await this.prisma.cliente.findMany({
      where: { ativo: true, cobrancaAutomatica: true },
      select: { id: true, nome: true, diaCobranca: true },
    });
    // Clientes marcados como automáticos mas sem dia definido nunca faturam — avisa (não some em silêncio).
    const semDia = automaticos.filter((c) => !c.diaCobranca);
    if (semDia.length) {
      this.logger.warn(`Cobrança automática sem diaCobranca (não serão faturados): ${semDia.map((c) => `#${c.id}`).join(', ')}`);
    }
    // Clamp para o último dia do mês (ex.: diaCobranca=31 fatura no dia 28/fev).
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const clientes = automaticos.filter((c) => c.diaCobranca && Math.min(c.diaCobranca, ultimoDiaMes) === dia);

    const resultados: { clienteId: number; ok: boolean; msg?: string }[] = [];
    for (const c of clientes) {
      const existente = await this.prisma.fatura.findFirst({
        where: { clienteId: c.id, periodo },
        select: { id: true },
      });
      if (existente) { resultados.push({ clienteId: c.id, ok: true, msg: 'já faturado' }); continue; }
      try {
        await this.gerarCobrancaMes(c.id, periodo);
        resultados.push({ clienteId: c.id, ok: true });
      } catch (e: any) {
        this.logger.error(`Cobrança automática cliente ${c.id}: ${e?.message}`);
        resultados.push({ clienteId: c.id, ok: false, msg: e?.message });
      }
    }
    this.ultimoDiaRodado = chaveDia;
    return { ok: true, periodo, processados: resultados.length, resultados };
  }

  configurada() {
    return { configurada: this.cora.isConfigured(), ambiente: process.env.CORA_ENV || 'stage' };
  }

  async findAll(status?: string) {
    return this.prisma.fatura.findMany({
      where: status ? { status } : {},
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  private async gerarNumeroFatura(periodo: string): Promise<string> {
    const prefix = `FAT-${periodo.replace('-', '')}-`;
    const ultima = await this.prisma.fatura.findFirst({
      where: { numero: { startsWith: prefix } },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const seq = ultima ? parseInt(ultima.numero.slice(prefix.length), 10) || 0 : 0;
    return `${prefix}${String(seq + 1).padStart(3, '0')}`;
  }

  /**
   * Cria (ou retorna a existente) a fatura do mês de um cliente, a partir dos
   * pedidos recebidos no período (mesma base do fechamento mensal).
   */
  async criarFaturaDoMes(clienteId: number, periodo: string, diasVencimento = 15) {
    const m = /^(\d{4})-(\d{2})$/.exec(periodo);
    if (!m) throw new BadRequestException('Período inválido (use YYYY-MM).');
    const ano = Number(m[1]);
    const mes = Number(m[2]);
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);

    const existente = await this.prisma.fatura.findFirst({
      where: { clienteId, periodo },
      include: INCLUDE,
    });
    if (existente) return existente;

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        clienteId,
        status: { notIn: ['rascunho', 'cancelado'] },
        pagamentoAdiantado: false,
        dataRecebimento: { gte: inicio, lt: fim },
      },
      select: {
        numero: true,
        itens: {
          select: {
            quantidade: true, preco: true, desconto: true,
            servico: { select: { nome: true } },
          },
        },
      },
    });
    if (pedidos.length === 0) throw new BadRequestException('Nenhum pedido faturável neste mês para o cliente.');

    // Uma linha por (serviço + preço unitário líquido), agregando quantidades —
    // evita boleto com centenas de linhas repetidas (mesma regra do fechamentoDetalhado).
    const round = (n: number) => Math.round(n * 100) / 100;
    const mapa = new Map<string, { descricao: string; quantidade: number; valor: number }>();
    let total = 0;
    for (const p of pedidos) {
      for (const it of p.itens) {
        const valor = round(Number(it.preco) * (1 - Number(it.desconto) / 100));
        const chave = `${it.servico.nome}::${valor}`;
        const cur = mapa.get(chave) ?? { descricao: it.servico.nome, quantidade: 0, valor };
        cur.quantidade += it.quantidade;
        mapa.set(chave, cur);
        total += valor * it.quantidade;
      }
    }
    const itens = Array.from(mapa.values());
    total = round(total);

    const numero = await this.gerarNumeroFatura(periodo);
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + diasVencimento);

    // @@unique([clienteId, periodo]) protege contra corrida (2 cliques / 2 réplicas):
    // se outra transação criou a fatura no meio, retorna a existente em vez de duplicar.
    try {
      return await this.prisma.fatura.create({
        data: {
          clienteId,
          numero,
          periodo,
          valorTotal: total,
          status: 'pendente',
          dataVencimento,
          itens: { create: itens },
        },
        include: INCLUDE,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const jaCriada = await this.prisma.fatura.findFirst({ where: { clienteId, periodo }, include: INCLUDE });
        if (jaCriada) return jaCriada;
      }
      throw e;
    }
  }

  /** Monta o payload do boleto Cora a partir da fatura + cliente. */
  private async montarPayload(faturaId: number) {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id: faturaId },
      include: {
        itens: true,
        cliente: {
          select: {
            nome: true, tipo: true, documento: true, email: true, emailFinanceiro: true,
            emailsCobranca: true,
            enderecos: { where: { principal: true }, take: 1 },
          },
        },
      },
    });
    if (!fatura) throw new NotFoundException(`Fatura #${faturaId} não encontrada.`);

    const c = fatura.cliente;
    const documento = soDigitos(this.crypto.decrypt(c.documento));
    const end = c.enderecos[0];
    const due = fatura.dataVencimento.toISOString().slice(0, 10);

    const payload: any = {
      code: fatura.numero,
      customer: {
        name: c.nome,
        email: c.emailFinanceiro || c.emailsCobranca?.[0] || c.email,
        document: { identity: documento, type: c.tipo === 'PJ' ? 'CNPJ' : 'CPF' },
      },
      services: fatura.itens.map((i) => ({
        name: i.descricao,
        amount: cents(Number(i.valor) * i.quantidade),
      })),
      payment_terms: { due_date: due },
    };
    if (end) {
      payload.customer.address = {
        street: end.logradouro,
        number: end.numero,
        district: end.bairro,
        city: end.cidade,
        state: end.uf,
        complement: end.complemento || undefined,
        zip_code: soDigitos(end.cep),
      };
    }
    // multa/juros padrão por env (opcional)
    const multa = Number(process.env.CORA_MULTA_PCT);
    const juros = Number(process.env.CORA_JUROS_MES_PCT);
    if (Number.isFinite(multa) && multa > 0) payload.payment_terms.fine = { rate: multa };
    if (Number.isFinite(juros) && juros > 0) payload.payment_terms.interest = { rate: juros };

    return payload;
  }

  /** Emite o boleto na Cora e persiste linha digitável/PDF/Pix na fatura. */
  async emitirBoleto(faturaId: number) {
    try {
      const payload = await this.montarPayload(faturaId);
      const inv = await this.cora.createInvoice(payload);
      // a Cora retorna campos como id, status, payment_options.bank_slip (linha digitável/barcode/pdf) e pix
      const slip = inv.payment_options?.bank_slip ?? inv.bank_slip ?? {};
      const pix = inv.payment_options?.pix ?? inv.pix ?? {};
      const atualizada = await this.prisma.fatura.update({
        where: { id: faturaId },
        data: {
          status: 'emitida',
          coraInvoiceId: String(inv.id ?? inv.invoice_id ?? ''),
          coraStatus: inv.status ?? null,
          linhaDigitavel: slip.digitable ?? slip.digitable_line ?? null,
          codigoBarras: slip.barcode ?? null,
          pdfUrl: slip.url ?? inv.pdf ?? null,
          pixQrCode: pix.emv ?? pix.qr_code ?? null,
          erroCobranca: null,
        },
        include: INCLUDE,
      });
      return atualizada;
    } catch (err: any) {
      // Fatura inexistente (montarPayload) → propaga o 404 sem tentar update
      // (que geraria P2025/500 e mascararia o erro real).
      if (err instanceof NotFoundException) throw err;
      await this.prisma.fatura.update({
        where: { id: faturaId },
        data: { status: 'erro', erroCobranca: err?.message ?? 'Erro ao emitir' },
      });
      throw err;
    }
  }

  /** Atalho: cria a fatura do mês (se não existir) e emite o boleto. */
  async gerarCobrancaMes(clienteId: number, periodo: string) {
    const fatura = await this.criarFaturaDoMes(clienteId, periodo);
    return this.emitirBoleto(fatura.id);
  }

  /**
   * Emite um boleto Cora "avulso" — sem Fatura interna — para uma cobrança que
   * roda por fora do fechamento por consumo (ex.: mensalidade de contrato,
   * separada do consumo). Só age com a Cora configurada.
   */
  async emitirBoletoAvulso(input: {
    clienteId: number;
    code: string;
    descricao: string;
    valor: number;
    dueDate: string;
  }) {
    if (!this.cora.isConfigured()) return { emitido: false, motivo: 'Cora não configurada' };

    const c = await this.prisma.cliente.findUnique({
      where: { id: input.clienteId },
      select: {
        nome: true, tipo: true, documento: true, email: true,
        emailFinanceiro: true, emailsCobranca: true,
        enderecos: { where: { principal: true }, take: 1 },
      },
    });
    if (!c) throw new NotFoundException(`Cliente #${input.clienteId} não encontrado.`);

    const documento = soDigitos(this.crypto.decrypt(c.documento));
    const end = c.enderecos[0];
    const payload: any = {
      code: input.code,
      customer: {
        name: c.nome,
        email: c.emailFinanceiro || c.emailsCobranca?.[0] || c.email,
        document: { identity: documento, type: c.tipo === 'PJ' ? 'CNPJ' : 'CPF' },
      },
      services: [{ name: input.descricao, amount: cents(input.valor) }],
      payment_terms: { due_date: input.dueDate },
    };
    if (end) {
      payload.customer.address = {
        street: end.logradouro, number: end.numero, district: end.bairro,
        city: end.cidade, state: end.uf, complement: end.complemento || undefined,
        zip_code: soDigitos(end.cep),
      };
    }
    const multa = Number(process.env.CORA_MULTA_PCT);
    const juros = Number(process.env.CORA_JUROS_MES_PCT);
    if (Number.isFinite(multa) && multa > 0) payload.payment_terms.fine = { rate: multa };
    if (Number.isFinite(juros) && juros > 0) payload.payment_terms.interest = { rate: juros };

    const inv = await this.cora.createInvoice(payload);
    return { emitido: true, coraInvoiceId: String(inv.id ?? inv.invoice_id ?? ''), status: inv.status ?? null };
  }

  /** Webhook da Cora: marca a fatura como paga quando o boleto é liquidado. */
  async webhook(body: any, token?: string) {
    // Endpoint público: exige o segredo registrado na URL do webhook da Cora.
    // Se CORA_WEBHOOK_SECRET não estiver definido, recusa (evita marcar paga sem verificação).
    const secret = process.env.CORA_WEBHOOK_SECRET;
    if (!secret) { this.logger.warn('Webhook Cora recebido sem CORA_WEBHOOK_SECRET configurado — ignorado.'); return { ok: false, ignored: 'webhook não configurado' }; }
    if (token !== secret) { this.logger.warn('Webhook Cora com token inválido — ignorado.'); return { ok: false, ignored: 'token inválido' }; }

    const invoiceId = String(body?.invoice_id ?? body?.id ?? body?.resource?.id ?? '');
    const evento = String(body?.event ?? body?.type ?? '').toLowerCase();
    if (!invoiceId) return { ok: true, ignored: 'sem invoice id' };

    const fatura = await this.prisma.fatura.findFirst({ where: { coraInvoiceId: invoiceId } });
    if (!fatura) return { ok: true, ignored: 'fatura não encontrada' };

    // Match por token exato (não substring): 'unpaid'/'settlement_failed' NÃO contam como pago.
    const tokens = evento.split(/[^a-z]+/).filter(Boolean);
    const negativo = tokens.some((t) => ['unpaid', 'failed', 'refused', 'canceled', 'cancelled', 'reversed', 'expired', 'pending', 'overdue'].includes(t));
    const positivo = tokens.includes('paid') || tokens.includes('settled');
    const pago = !negativo && (body?.status === 'PAID' || positivo);
    await this.prisma.fatura.update({
      where: { id: fatura.id },
      data: {
        coraStatus: body?.status ?? evento,
        ...(pago ? { status: 'paga', dataPagamento: new Date() } : {}),
      },
    });
    return { ok: true, faturaId: fatura.id, pago };
  }

  /** Sincroniza o status de uma fatura consultando a Cora. */
  async sincronizar(faturaId: number) {
    const fatura = await this.prisma.fatura.findUnique({ where: { id: faturaId } });
    if (!fatura) throw new NotFoundException(`Fatura #${faturaId} não encontrada.`);
    if (!fatura.coraInvoiceId) throw new BadRequestException('Fatura sem boleto emitido.');
    const inv = await this.cora.getInvoice(fatura.coraInvoiceId);
    const pago = String(inv?.status ?? '').toUpperCase() === 'PAID';
    return this.prisma.fatura.update({
      where: { id: faturaId },
      data: { coraStatus: inv?.status ?? null, ...(pago ? { status: 'paga', dataPagamento: new Date() } : {}) },
      include: INCLUDE,
    });
  }
}
