import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
export class CobrancaService {
  private readonly logger = new Logger('CobrancaService');

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private cora: CoraClient,
  ) {}

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

    // uma linha por (serviço) agregando quantidade e valor
    const itens: { descricao: string; quantidade: number; valor: number }[] = [];
    let total = 0;
    for (const p of pedidos) {
      for (const it of p.itens) {
        const liquido = Number(it.preco) * (1 - Number(it.desconto) / 100);
        itens.push({ descricao: it.servico.nome, quantidade: it.quantidade, valor: Math.round(liquido * 100) / 100 });
        total += liquido * it.quantidade;
      }
    }
    total = Math.round(total * 100) / 100;

    const numero = await this.gerarNumeroFatura(periodo);
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + diasVencimento);

    return this.prisma.fatura.create({
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
        email: c.emailFinanceiro || c.email,
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

  /** Webhook da Cora: marca a fatura como paga quando o boleto é liquidado. */
  async webhook(body: any) {
    const invoiceId = String(body?.invoice_id ?? body?.id ?? body?.resource?.id ?? '');
    const evento = String(body?.event ?? body?.type ?? '').toLowerCase();
    if (!invoiceId) return { ok: true, ignored: 'sem invoice id' };

    const fatura = await this.prisma.fatura.findFirst({ where: { coraInvoiceId: invoiceId } });
    if (!fatura) return { ok: true, ignored: 'fatura não encontrada' };

    const pago = evento.includes('paid') || evento.includes('settle') || body?.status === 'PAID';
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
