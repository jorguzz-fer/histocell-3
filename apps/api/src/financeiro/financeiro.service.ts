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
}
