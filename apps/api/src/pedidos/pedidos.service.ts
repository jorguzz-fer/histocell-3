import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';

const STATUS_VALIDOS = ['rascunho', 'enviado', 'recebido', 'cancelado'];

// ─── helpers ─────────────────────────────────────────────────────────────────

function calcSubtotal(preco: number, quantidade: number, desconto: number): number {
  return preco * quantidade * (1 - desconto / 100);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// ─── INCLUDE padrão para respostas ───────────────────────────────────────────

const INCLUDE_FULL = {
  cliente: { select: { id: true, nome: true, nomeFantasia: true } },
  itens: {
    include: {
      servico: {
        select: { id: true, codigo: true, nome: true, precoBase: true },
      },
    },
  },
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  // ── numero sequencial diário ────────────────────────────────────────────────
  private async gerarNumero(): Promise<string> {
    const hoje = toDateStr(new Date());
    const prefix = `PED-${hoje}-`;
    const count = await this.prisma.pedido.count({
      where: { numero: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  // ── shape de resposta com totais ────────────────────────────────────────────
  private toShape(pedido: any) {
    const valorTotal = (pedido.itens ?? []).reduce(
      (sum: number, item: any) =>
        sum + calcSubtotal(Number(item.preco), item.quantidade, Number(item.desconto)),
      0,
    );
    return {
      ...pedido,
      itens: (pedido.itens ?? []).map((item: any) => ({
        ...item,
        preco: Number(item.preco),
        desconto: Number(item.desconto),
        subtotal: Math.round(calcSubtotal(Number(item.preco), item.quantidade, Number(item.desconto)) * 100) / 100,
      })),
      valorTotal: Math.round(valorTotal * 100) / 100,
      totalItens: (pedido.itens ?? []).length,
      clienteNome: pedido.cliente?.nome ?? '',
      clienteNomeFantasia: pedido.cliente?.nomeFantasia ?? null,
    };
  }

  // ── Criar serviço customizado on-the-fly ────────────────────────────────────
  async criarServico(dto: {
    codigo: string
    categoria: string
    nome: string
    precoBase: number
    precoRotina: number
    precoPesquisa: number
  }) {
    const servico = await this.prisma.servico.create({
      data: {
        codigo: dto.codigo,
        categoria: dto.categoria,
        nome: dto.nome,
        precoBase: dto.precoBase,
        precoRotina: dto.precoRotina,
        precoPesquisa: dto.precoPesquisa,
      },
    });
    return {
      ...servico,
      precoBase: Number(servico.precoBase),
      precoRotina: Number(servico.precoRotina),
      precoPesquisa: Number(servico.precoPesquisa),
    };
  }

  // ── Servicos disponíveis (para o picker do form) ────────────────────────────
  async listarServicos() {
    const servicos = await this.prisma.servico.findMany({
      where: { ativo: true },
      select: {
        id: true, codigo: true, codigoLegado: true, categoria: true,
        nome: true, precoBase: true, precoRotina: true, precoPesquisa: true,
      },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });
    return servicos.map((s) => ({
      ...s,
      precoBase:     Number(s.precoBase),
      precoRotina:   Number(s.precoRotina),
      precoPesquisa: Number(s.precoPesquisa),
    }));
  }

  // ── Preço unitário: TabelaPreco → preço pelo segmento do cliente → base ─────
  async getPreco(clienteId: number, servicoId: number) {
    // 1. Preço customizado por cliente
    const tabela = await this.prisma.tabelaPreco.findUnique({
      where: { clienteId_servicoId: { clienteId, servicoId } },
    });
    if (tabela) {
      return { preco: Number(tabela.preco), desconto: Number(tabela.desconto), origem: 'tabela' };
    }

    // 2. Segmento do cliente determina rotina vs pesquisa
    const [cliente, servico] = await Promise.all([
      this.prisma.cliente.findUnique({ where: { id: clienteId }, select: { segmento: true } }),
      this.prisma.servico.findUnique({
        where: { id: servicoId },
        select: { precoRotina: true, precoPesquisa: true, precoBase: true },
      }),
    ]);
    if (!servico) throw new NotFoundException(`Serviço #${servicoId} não encontrado.`);

    const isPesquisador = cliente?.segmento === 'pesquisador';
    const preco = isPesquisador ? Number(servico.precoPesquisa) : Number(servico.precoRotina || servico.precoBase);

    return {
      preco,
      desconto: 0,
      origem: isPesquisador ? 'pesquisa' : 'rotina',
    };
  }

  // ── LIST ────────────────────────────────────────────────────────────────────
  async findAll(filter: FilterPedidoDto) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.status) where.status = filter.status;
    if (filter.clienteId) where.clienteId = filter.clienteId;
    if (filter.busca) {
      where.OR = [
        { numero: { contains: filter.busca, mode: 'insensitive' } },
        { cliente: { nome: { contains: filter.busca, mode: 'insensitive' } } },
        { cliente: { nomeFantasia: { contains: filter.busca, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.pedido.count({ where }),
      this.prisma.pedido.findMany({
        where,
        include: INCLUDE_FULL,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items.map((p) => this.toShape(p)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── GET ONE ─────────────────────────────────────────────────────────────────
  async findOne(id: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!pedido) throw new NotFoundException(`Pedido #${id} não encontrado.`);
    return this.toShape(pedido);
  }

  // ── CREATE ──────────────────────────────────────────────────────────────────
  async create(dto: CreatePedidoDto) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id: dto.clienteId } });
    if (!cliente) throw new NotFoundException(`Cliente #${dto.clienteId} não encontrado.`);

    const numero = await this.gerarNumero();

    const pedido = await this.prisma.pedido.create({
      data: {
        clienteId: dto.clienteId,
        numero,
        observacoes: dto.observacoes,
        itens: {
          create: dto.itens.map((item) => ({
            servicoId: item.servicoId,
            quantidade: item.quantidade,
            preco: item.preco,
            desconto: item.desconto ?? 0,
          })),
        },
      },
      include: INCLUDE_FULL,
    });

    return this.toShape(pedido);
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────────
  async update(id: number, dto: UpdatePedidoDto) {
    const existing = await this.prisma.pedido.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Pedido #${id} não encontrado.`);
    if (existing.status === 'cancelado') {
      throw new BadRequestException('Pedido cancelado não pode ser editado.');
    }

    const { itens, status, clienteId, ...fields } = dto;

    const dataFields: any = { ...fields };
    if (status) {
      dataFields.status = status;
      if (status === 'enviado' && !existing.dataEnvio) dataFields.dataEnvio = new Date();
      if (status === 'recebido' && !existing.dataRecebimento) dataFields.dataRecebimento = new Date();
    }
    if (clienteId) dataFields.clienteId = clienteId;

    if (itens) {
      dataFields.itens = {
        deleteMany: {},
        create: itens.map((item) => ({
          servicoId: item.servicoId,
          quantidade: item.quantidade,
          preco: item.preco,
          desconto: item.desconto ?? 0,
        })),
      };
    }

    const pedido = await this.prisma.pedido.update({
      where: { id },
      data: dataFields,
      include: INCLUDE_FULL,
    });

    return this.toShape(pedido);
  }

  // ── UPDATE STATUS ────────────────────────────────────────────────────────────
  async updateStatus(id: number, status: string) {
    if (!STATUS_VALIDOS.includes(status)) {
      throw new BadRequestException(`Status inválido: ${status}`);
    }
    const existing = await this.prisma.pedido.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Pedido #${id} não encontrado.`);

    const dataFields: any = { status };
    if (status === 'enviado' && !existing.dataEnvio) dataFields.dataEnvio = new Date();
    if (status === 'recebido' && !existing.dataRecebimento) dataFields.dataRecebimento = new Date();

    const pedido = await this.prisma.pedido.update({
      where: { id },
      data: dataFields,
      include: INCLUDE_FULL,
    });

    return this.toShape(pedido);
  }

  // ── REMOVE (apenas rascunho) ─────────────────────────────────────────────────
  async remove(id: number) {
    const existing = await this.prisma.pedido.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Pedido #${id} não encontrado.`);
    if (existing.status !== 'rascunho') {
      throw new BadRequestException('Apenas pedidos em rascunho podem ser excluídos.');
    }

    await this.prisma.itemPedido.deleteMany({ where: { pedidoId: id } });
    await this.prisma.pedido.delete({ where: { id } });

    return { message: `Pedido #${id} excluído com sucesso.` };
  }
}
