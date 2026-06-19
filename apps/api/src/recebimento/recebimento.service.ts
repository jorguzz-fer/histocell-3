import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { ReceberPedidoDto } from './dto/receber-pedido.dto';
import { EntradaRecepcaoDto } from './dto/entrada-recepcao.dto';
import { UpdateAmostraDto } from './dto/update-amostra.dto';
import { FilterAmostraDto } from './dto/filter-amostra.dto';

// ─── include padrão de amostra ────────────────────────────────────────────────

const INCLUDE_AMOSTRA = {
  pedido: {
    select: {
      id: true,
      numero: true,
      cliente: { select: { id: true, nome: true, nomeFantasia: true } },
    },
  },
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class RecebimentoService {
  constructor(
    private prisma: PrismaService,
    private financeiro: FinanceiroService,
  ) {}

  // ── número interno Histocell: sequencial contínuo (não reinicia por dia) ──────
  private async gerarNumeroInterno(): Promise<string> {
    const rows = await this.prisma.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('histocell_amostra_numero_seq') AS nextval`,
    );
    return String(Number(rows[0].nextval)).padStart(5, '0');
  }

  // ── Fila por status (com recipientes) ─────────────────────────────────────────
  private async filaPorStatus(status: string) {
    const pedidos = await this.prisma.pedido.findMany({
      where: { status },
      include: {
        cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        itens: { include: { servico: { select: { nome: true, codigo: true } } } },
        amostras: { select: { id: true, status: true } },
        recipientes: true,
      },
      orderBy: { dataEnvio: 'asc' },
    });

    return pedidos.map((p) => ({
      ...p,
      itens: p.itens.map((i) => ({ ...i, preco: Number(i.preco), desconto: Number(i.desconto) })),
      clienteNome: p.cliente?.nome ?? '',
      clienteNomeFantasia: p.cliente?.nomeFantasia ?? null,
      totalAmostras: p.amostras.length,
    }));
  }

  /** Etapa 1 — Recepção: pedidos enviados aguardando entrada */
  async filaRecepcao() { return this.filaPorStatus('enviado'); }
  /** Etapa 2 — Laboratório: pedidos com entrada feita, aguardando identificação */
  async filaLaboratorio() { return this.filaPorStatus('recepcao'); }
  /** back-compat */
  async findFila() { return this.filaRecepcao(); }

  // ── Tipos de recipiente ───────────────────────────────────────────────────────
  async tiposRecipiente() {
    return this.prisma.tipoRecipiente.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }
  async criarTipoRecipiente(nome: string) {
    const limpo = nome.trim();
    return this.prisma.tipoRecipiente.upsert({
      where: { nome: limpo },
      update: { ativo: true },
      create: { nome: limpo, ordem: 99 },
    });
  }

  // ── Etapa 1 — registrar entrada (recipientes) → status 'recepcao' ──────────────
  async registrarEntrada(dto: EntradaRecepcaoDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      select: { id: true, status: true },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${dto.pedidoId} não encontrado.`);
    if (!['enviado', 'rascunho'].includes(pedido.status)) {
      throw new BadRequestException(
        `Pedido está em "${pedido.status}" e não pode registrar entrada agora.`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.recipiente.createMany({
        data: dto.recipientes.map((r) => ({
          pedidoId: dto.pedidoId,
          tipo: r.tipo,
          quantidade: r.quantidade,
          observacoes: r.observacoes,
          recebidoPor: dto.recebidoPor,
        })),
      }),
      this.prisma.pedido.update({ where: { id: dto.pedidoId }, data: { status: 'recepcao', dataRecepcao: new Date() } }),
    ]);
    const total = dto.recipientes.reduce((s, r) => s + r.quantidade, 0);
    return { message: `Entrada registrada (${total} recipiente(s)). Pedido enviado ao Laboratório.` };
  }

  // ── Lista de amostras (paginada) ──────────────────────────────────────────────
  async findAllAmostras(filter: FilterAmostraDto) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.status) where.status = filter.status;
    if (filter.pedidoId) where.pedidoId = filter.pedidoId;
    if (filter.busca) {
      where.OR = [
        { numeroInterno: { contains: filter.busca, mode: 'insensitive' } },
        { numeroCliente: { contains: filter.busca, mode: 'insensitive' } },
        { pedido: { numero: { contains: filter.busca, mode: 'insensitive' } } },
        { pedido: { cliente: { nome: { contains: filter.busca, mode: 'insensitive' } } } },
        { pedido: { cliente: { nomeFantasia: { contains: filter.busca, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.amostra.count({ where }),
      this.prisma.amostra.findMany({
        where,
        include: INCLUDE_AMOSTRA,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Amostra individual ────────────────────────────────────────────────────────
  async findOneAmostra(id: number) {
    const amostra = await this.prisma.amostra.findUnique({
      where: { id },
      include: INCLUDE_AMOSTRA,
    });
    if (!amostra) throw new NotFoundException(`Amostra #${id} não encontrada.`);
    return amostra;
  }

  // ── Receber pedido: registra amostras + avança status ─────────────────────────
  async receberPedido(dto: ReceberPedidoDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      select: {
        id: true,
        numero: true,
        clienteId: true,
        status: true,
        observacoes: true,
        pagamentoAdiantado: true,
        itens: { select: { quantidade: true, preco: true, desconto: true } },
      },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${dto.pedidoId} não encontrado.`);
    if (!['enviado', 'rascunho', 'recepcao'].includes(pedido.status)) {
      throw new BadRequestException(
        `Pedido está com status "${pedido.status}" e não pode ser recebido agora.`,
      );
    }

    const agora = new Date();
    const amostrasCreated: any[] = [];

    for (const item of dto.amostras) {
      const numeroInterno = await this.gerarNumeroInterno();
      const amostra = await this.prisma.amostra.create({
        data: {
          pedidoId: dto.pedidoId,
          numeroInterno,
          numeroCliente: item.numeroCliente,
          especie: item.especie ?? 'A definir',
          material: item.material ?? 'A definir',
          localizacao: item.localizacao,
          observacoes: item.observacoes,
          status: 'pendente',
          dataRecebimento: agora,
          recebidoPor: dto.recebidoPor,
        },
        include: INCLUDE_AMOSTRA,
      });
      amostrasCreated.push(amostra);
    }

    // ── Conferência: previsto x recebido ──────────────────────────────────────
    const recebida = amostrasCreated.length;
    const somaItens = pedido.itens.reduce((s, i) => s + i.quantidade, 0);
    const prevista =
      dto.qtdPrevista != null && dto.qtdPrevista >= 0 ? dto.qtdPrevista : somaItens;
    const diferenca = recebida - prevista;
    const excedente = diferenca > 0;

    // Notas de conferência (automática + manual)
    const dataStr = agora.toLocaleDateString('pt-BR');
    const notas: string[] = [];
    if (excedente) {
      notas.push(
        `[Conferência ${dataStr}] Recebidas ${recebida} amostra(s) vs ${prevista} prevista(s) — ` +
          `${diferenca} a mais. Verificar cobrança do excedente.`,
      );
    } else if (diferenca < 0) {
      notas.push(
        `[Conferência ${dataStr}] Recebidas ${recebida} amostra(s) vs ${prevista} prevista(s) — ` +
          `${Math.abs(diferenca)} a menos.`,
      );
    }
    if (dto.observacaoConferencia?.trim()) {
      notas.push(`[Conferência ${dataStr}] ${dto.observacaoConferencia.trim()}`);
    }
    const observacoes = [pedido.observacoes, ...notas].filter(Boolean).join('\n');

    await this.prisma.pedido.update({
      where: { id: dto.pedidoId },
      data: {
        status: 'recebido',
        dataRecebimento: agora,
        qtdPrevista: prevista,
        qtdRecebida: recebida,
        excedente,
        observacoes: observacoes || undefined,
      },
    });

    // ── Abatimento automático do crédito pré-pago (se houver e não pago adiantado) ──
    let credito: { abatido: number; saldo: number } | null = null;
    if (!pedido.pagamentoAdiantado) {
      const valorPedido =
        Math.round(
          pedido.itens.reduce(
            (s, i) => s + Number(i.preco) * i.quantidade * (1 - Number(i.desconto) / 100),
            0,
          ) * 100,
        ) / 100;
      try {
        credito = await this.financeiro.debitarPorPedido({
          clienteId: pedido.clienteId,
          pedidoId: pedido.id,
          pedidoNumero: pedido.numero,
          valorPedido,
        });
      } catch {
        /* falha no abatimento não bloqueia o recebimento */
      }
    }

    return {
      message: `${recebida} amostra(s) registrada(s). Pedido #${dto.pedidoId} marcado como recebido.`,
      amostras: amostrasCreated,
      conferencia: { prevista, recebida, diferenca, excedente },
      credito, // { abatido, saldo } quando consumiu crédito; senão null
    };
  }

  // ── Atualizar amostra ──────────────────────────────────────────────────────────
  async updateAmostra(id: number, dto: UpdateAmostraDto) {
    await this.findOneAmostra(id);
    const updated = await this.prisma.amostra.update({
      where: { id },
      data: { ...dto },
      include: INCLUDE_AMOSTRA,
    });
    return updated;
  }
}
