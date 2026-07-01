import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { LancarCreditoDto } from './dto/lancar-credito.dto';

@Injectable()
export class FinanceiroService {
  constructor(private prisma: PrismaService) {}

  // ── Lança crédito/débito e recalcula o saldo acumulado ───────────────────────
  async lancarCredito(dto: LancarCreditoDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException(`Cliente #${dto.clienteId} não encontrado.`);

    return this.prisma.$transaction(async (tx) => {
      const ultimo = await tx.creditoPrePago.findFirst({
        where: { clienteId: dto.clienteId },
        orderBy: { id: 'desc' },
        select: { saldo: true },
      });
      const saldoAnterior = ultimo ? Number(ultimo.saldo) : 0;
      const delta = dto.tipo === 'credito' ? dto.valor : -dto.valor;
      const saldo = Math.round((saldoAnterior + delta) * 100) / 100;

      const mov = await tx.creditoPrePago.create({
        data: {
          clienteId: dto.clienteId,
          tipo: dto.tipo,
          valor: dto.valor,
          descricao: dto.descricao,
          saldo,
        },
      });
      return { ...mov, valor: Number(mov.valor), saldo: Number(mov.saldo) };
    });
  }

  // ── Débito automático ao receber um pedido (consome o crédito disponível) ────
  // Idempotente (1 débito por pedido); consome só até zerar o saldo. Retorna o
  // valor abatido (0 se não havia crédito ou já debitado).
  async debitarPorPedido(args: {
    clienteId: number;
    pedidoId: number;
    pedidoNumero: string;
    valorPedido: number;
  }): Promise<{ abatido: number; saldo: number } | null> {
    if (args.valorPedido <= 0) return null;

    return this.prisma.$transaction(async (tx) => {
      // já debitado para este pedido? (idempotência)
      const existente = await tx.creditoPrePago.findFirst({
        where: { pedidoId: args.pedidoId },
        select: { id: true },
      });
      if (existente) return null;

      const ultimo = await tx.creditoPrePago.findFirst({
        where: { clienteId: args.clienteId },
        orderBy: { id: 'desc' },
        select: { saldo: true },
      });
      const saldoAtual = ultimo ? Number(ultimo.saldo) : 0;
      if (saldoAtual <= 0) return null; // sem crédito → cobrança normal

      const abatido = Math.round(Math.min(saldoAtual, args.valorPedido) * 100) / 100;
      const saldo = Math.round((saldoAtual - abatido) * 100) / 100;
      const parcial = abatido < args.valorPedido;

      await tx.creditoPrePago.create({
        data: {
          clienteId: args.clienteId,
          pedidoId: args.pedidoId,
          tipo: 'debito',
          valor: abatido,
          descricao:
            `Consumo do pedido ${args.pedidoNumero}` +
            (parcial ? ` (parcial — pedido R$ ${args.valorPedido.toFixed(2)})` : ''),
          saldo,
        },
      });
      return { abatido, saldo };
    });
  }

  // ── Saldo atual de um cliente (leve — para exibir no pedido) ─────────────────
  async saldoCliente(clienteId: number) {
    const ultimo = await this.prisma.creditoPrePago.findFirst({
      where: { clienteId },
      orderBy: { id: 'desc' },
      select: { saldo: true },
    });
    return { clienteId, saldo: ultimo ? Number(ultimo.saldo) : 0 };
  }

  // ── Extrato de um cliente (movimentos + saldo atual) ─────────────────────────
  async extrato(clienteId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, nome: true, nomeFantasia: true },
    });
    if (!cliente) throw new NotFoundException(`Cliente #${clienteId} não encontrado.`);

    const movimentos = await this.prisma.creditoPrePago.findMany({
      where: { clienteId },
      orderBy: { id: 'desc' },
    });
    const saldoAtual = movimentos.length ? Number(movimentos[0].saldo) : 0;

    return {
      cliente,
      saldoAtual,
      movimentos: movimentos.map((m) => ({
        ...m,
        valor: Number(m.valor),
        saldo: Number(m.saldo),
      })),
    };
  }

  // ── Resumo: saldo atual por cliente (último lançamento) ──────────────────────
  async resumoCreditos() {
    const rows = await this.prisma.$queryRawUnsafe<
      { clienteId: number; saldo: string; nome: string; nomeFantasia: string | null }[]
    >(
      `SELECT DISTINCT ON (c."clienteId")
         c."clienteId", c."saldo", cl."nome", cl."nomeFantasia"
       FROM "CreditoPrePago" c
       JOIN "Cliente" cl ON cl.id = c."clienteId"
       ORDER BY c."clienteId", c.id DESC`,
    );
    return rows
      .map((r) => ({
        clienteId: r.clienteId,
        nome: r.nome,
        nomeFantasia: r.nomeFantasia,
        saldo: Number(r.saldo),
      }))
      .sort((a, b) => (a.nomeFantasia ?? a.nome).localeCompare(b.nomeFantasia ?? b.nome, 'pt'));
  }

  // ── Fechamento mensal: o que cada cliente consumiu no mês (base da fatura) ────
  // Considera pedidos recebidos (dataRecebimento dentro do mês). A emissão de
  // boleto/NFe (Cora) é um passo posterior, fora deste cálculo.
  async fechamentoMensal(ano: number, mes: number) {
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1); // exclusivo

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        status: { notIn: ['rascunho', 'cancelado'] },
        dataRecebimento: { gte: inicio, lt: fim },
      },
      select: {
        clienteId: true,
        numero: true,
        pagamentoAdiantado: true,
        cliente: { select: { nome: true, nomeFantasia: true } },
        itens: { select: { preco: true, quantidade: true, desconto: true } },
      },
    });

    // saldo de crédito atual por cliente
    const saldos = await this.resumoCreditos();
    const saldoMap = new Map(saldos.map((s) => [s.clienteId, s.saldo]));

    const porCliente = new Map<
      number,
      { clienteId: number; nome: string; nomeFantasia: string | null; qtdPedidos: number; totalBruto: number; adiantado: number }
    >();

    for (const p of pedidos) {
      const valor = p.itens.reduce(
        (s, i) => s + Number(i.preco) * i.quantidade * (1 - Number(i.desconto) / 100),
        0,
      );
      const cur =
        porCliente.get(p.clienteId) ?? {
          clienteId: p.clienteId,
          nome: p.cliente.nome,
          nomeFantasia: p.cliente.nomeFantasia,
          qtdPedidos: 0,
          totalBruto: 0,
          adiantado: 0,
        };
      cur.qtdPedidos += 1;
      cur.totalBruto += valor;
      if (p.pagamentoAdiantado) cur.adiantado += valor;
      porCliente.set(p.clienteId, cur);
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    const linhas = Array.from(porCliente.values())
      .map((c) => ({
        clienteId: c.clienteId,
        nome: c.nome,
        nomeFantasia: c.nomeFantasia,
        qtdPedidos: c.qtdPedidos,
        totalBruto: round(c.totalBruto),
        adiantado: round(c.adiantado),
        aFaturar: round(c.totalBruto - c.adiantado),
        creditoSaldo: saldoMap.get(c.clienteId) ?? 0,
      }))
      .sort((a, b) => (a.nomeFantasia ?? a.nome).localeCompare(b.nomeFantasia ?? b.nome, 'pt'));

    return {
      ano,
      mes,
      linhas,
      totais: {
        clientes: linhas.length,
        pedidos: linhas.reduce((s, l) => s + l.qtdPedidos, 0),
        totalBruto: round(linhas.reduce((s, l) => s + l.totalBruto, 0)),
        aFaturar: round(linhas.reduce((s, l) => s + l.aFaturar, 0)),
      },
    };
  }

  // ── Fechamento detalhado: discriminação por serviço de um cliente no mês ──────
  // Base da NF (ex.: "10 H&E, 15 lâminas em branco, 10 específica").
  async fechamentoDetalhado(clienteId: number, ano: number, mes: number) {
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);

    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { nome: true, nomeFantasia: true, segmento: true, projeto: true },
    });
    if (!cliente) throw new NotFoundException(`Cliente #${clienteId} não encontrado.`);

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        clienteId,
        status: { notIn: ['rascunho', 'cancelado'] },
        dataRecebimento: { gte: inicio, lt: fim },
      },
      select: {
        numero: true,
        itens: {
          select: {
            quantidade: true, preco: true, desconto: true,
            servico: { select: { nome: true, codigo: true } },
          },
        },
      },
      orderBy: { dataRecebimento: 'asc' },
    });

    const round = (n: number) => Math.round(n * 100) / 100;
    // agrega por (serviço + preço unitário líquido), somando quantidades
    const mapa = new Map<string, { servico: string; codigo: string; quantidade: number; valorUnit: number; valorTotal: number }>();
    for (const p of pedidos) {
      for (const it of p.itens) {
        const unit = round(Number(it.preco) * (1 - Number(it.desconto) / 100));
        const chave = `${it.servico.codigo}::${unit}`;
        const cur = mapa.get(chave) ?? { servico: it.servico.nome, codigo: it.servico.codigo, quantidade: 0, valorUnit: unit, valorTotal: 0 };
        cur.quantidade += it.quantidade;
        cur.valorTotal = round(cur.valorTotal + unit * it.quantidade);
        mapa.set(chave, cur);
      }
    }
    const linhas = Array.from(mapa.values()).sort((a, b) => a.servico.localeCompare(b.servico, 'pt'));
    const total = round(linhas.reduce((s, l) => s + l.valorTotal, 0));

    return {
      cliente: cliente.nomeFantasia ?? cliente.nome,
      segmento: cliente.segmento,
      projeto: cliente.projeto,
      periodo: `${ano}-${String(mes).padStart(2, '0')}`,
      pedidos: pedidos.map((p) => p.numero),
      linhas,
      total,
    };
  }
}
