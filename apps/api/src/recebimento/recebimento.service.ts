import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ReceberPedidoDto } from './dto/receber-pedido.dto';
import { UpdateAmostraDto } from './dto/update-amostra.dto';
import { FilterAmostraDto } from './dto/filter-amostra.dto';

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

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
  constructor(private prisma: PrismaService) {}

  // ── número interno sequencial diário ─────────────────────────────────────────
  private async gerarNumeroInterno(): Promise<string> {
    const hoje = toDateStr(new Date());
    const prefix = `AM-${hoje}-`;
    const count = await this.prisma.amostra.count({
      where: { numeroInterno: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  // ── Fila: pedidos enviados aguardando recebimento ─────────────────────────────
  async findFila() {
    const pedidos = await this.prisma.pedido.findMany({
      where: { status: 'enviado' },
      include: {
        cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        itens: {
          include: { servico: { select: { nome: true, codigo: true } } },
        },
        amostras: { select: { id: true, status: true } },
      },
      orderBy: { dataEnvio: 'asc' },
    });

    return pedidos.map((p) => ({
      ...p,
      itens: p.itens.map((i) => ({
        ...i,
        preco: Number(i.preco),
        desconto: Number(i.desconto),
      })),
      clienteNome: p.cliente?.nome ?? '',
      clienteNomeFantasia: p.cliente?.nomeFantasia ?? null,
      totalAmostras: p.amostras.length,
    }));
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
      select: { id: true, status: true },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${dto.pedidoId} não encontrado.`);
    if (!['enviado', 'rascunho'].includes(pedido.status)) {
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
          especie: item.especie,
          material: item.material,
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

    // Avança pedido para "recebido"
    await this.prisma.pedido.update({
      where: { id: dto.pedidoId },
      data: { status: 'recebido', dataRecebimento: agora },
    });

    return {
      message: `${amostrasCreated.length} amostra(s) registrada(s). Pedido #${dto.pedidoId} marcado como recebido.`,
      amostras: amostrasCreated,
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
