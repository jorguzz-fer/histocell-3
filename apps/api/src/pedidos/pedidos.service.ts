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
    tipo?:      string
    variante1?: string
    variante2?: string
    variante3?: string
    variante4?: string
    variante5?: string
  }) {
    const servico = await this.prisma.servico.create({
      data: {
        codigo:       dto.codigo,
        categoria:    dto.categoria,
        nome:         dto.nome,
        precoBase:    dto.precoBase,
        precoRotina:  dto.precoRotina,
        precoPesquisa: dto.precoPesquisa,
        tipo:         dto.tipo      ?? null,
        variante1:    dto.variante1 ?? null,
        variante2:    dto.variante2 ?? null,
        variante3:    dto.variante3 ?? null,
        variante4:    dto.variante4 ?? null,
        variante5:    dto.variante5 ?? null,
      },
    });
    return {
      ...servico,
      precoBase: Number(servico.precoBase),
      precoRotina: Number(servico.precoRotina),
      precoPesquisa: Number(servico.precoPesquisa),
    };
  }

  // ── Seleção guiada (cascata) ────────────────────────────────────────────────
  async getCascadeOptions(params: {
    categoria?: string; tipo?: string
    v1?: string; v2?: string; v3?: string; v4?: string
  }) {
    const where: any = { ativo: true };
    if (params.categoria) where.categoria = params.categoria;
    if (params.tipo)      where.tipo       = params.tipo;
    if (params.v1)        where.variante1  = params.v1;
    if (params.v2)        where.variante2  = params.v2;
    if (params.v3)        where.variante3  = params.v3;
    if (params.v4)        where.variante4  = params.v4;

    const servicos = await this.prisma.servico.findMany({
      where,
      select: {
        id: true, codigo: true, nome: true, categoria: true,
        tipo: true, variante1: true, variante2: true, variante3: true,
        variante4: true, variante5: true,
        precoBase: true, precoRotina: true, precoPesquisa: true,
      },
    });

    const unique = <T>(arr: (T | null)[]): T[] =>
      Array.from(new Set(arr.filter((v): v is T => v !== null)));

    return {
      categorias:  unique(servicos.map((s) => s.categoria)),
      tipos:       unique(servicos.map((s) => s.tipo)),
      variante1s:  unique(servicos.map((s) => s.variante1)),
      variante2s:  unique(servicos.map((s) => s.variante2)),
      variante3s:  unique(servicos.map((s) => s.variante3)),
      variante4s:  unique(servicos.map((s) => s.variante4)),
      variante5s:  unique(servicos.map((s) => s.variante5)),
      services: servicos.map((s) => ({
        ...s,
        precoBase:     Number(s.precoBase),
        precoRotina:   Number(s.precoRotina),
        precoPesquisa: Number(s.precoPesquisa),
      })),
      total: servicos.length,
    };
  }

  // ── Serviços mais usados (top 10 por ocorrência em pedidos) ─────────────────
  async getPopulares() {
    const grouped = await this.prisma.itemPedido.groupBy({
      by: ['servicoId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    if (grouped.length === 0) return [];

    const ids = grouped.map((g) => g.servicoId);
    const servicos = await this.prisma.servico.findMany({
      where: { id: { in: ids }, ativo: true },
      select: {
        id: true, codigo: true, nome: true, categoria: true,
        precoBase: true, precoRotina: true, precoPesquisa: true,
      },
    });

    // Ordenar pela ordem original (mais usado primeiro)
    return ids
      .map((id) => {
        const s = servicos.find((sv) => sv.id === id);
        if (!s) return null;
        const g = grouped.find((gp) => gp.servicoId === id);
        return {
          ...s,
          precoBase:     Number(s.precoBase),
          precoRotina:   Number(s.precoRotina),
          precoPesquisa: Number(s.precoPesquisa),
          totalUsos:     g?._count.id ?? 0,
        };
      })
      .filter(Boolean);
  }

  // ── Favoritos do usuário ─────────────────────────────────────────────────────
  async getFavoritos(userId: number) {
    const favs = await this.prisma.servicoFavorito.findMany({
      where: { userId },
      include: {
        servico: {
          select: {
            id: true, codigo: true, nome: true, categoria: true,
            precoBase: true, precoRotina: true, precoPesquisa: true, ativo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return favs
      .filter((f) => f.servico.ativo)
      .map((f) => ({
        ...f.servico,
        precoBase:     Number(f.servico.precoBase),
        precoRotina:   Number(f.servico.precoRotina),
        precoPesquisa: Number(f.servico.precoPesquisa),
        favoritoId:    f.id,
      }));
  }

  async toggleFavorito(userId: number, servicoId: number) {
    const existing = await this.prisma.servicoFavorito.findUnique({
      where: { userId_servicoId: { userId, servicoId } },
    });
    if (existing) {
      await this.prisma.servicoFavorito.delete({ where: { id: existing.id } });
      return { favoritado: false };
    }
    await this.prisma.servicoFavorito.create({ data: { userId, servicoId } });
    return { favoritado: true };
  }

  async isFavorito(userId: number, servicoId: number) {
    const fav = await this.prisma.servicoFavorito.findUnique({
      where: { userId_servicoId: { userId, servicoId } },
    });
    return { favoritado: Boolean(fav) };
  }

  // ── Histórico de serviços de um cliente ──────────────────────────────────────
  async getHistoricoCliente(clienteId: number) {
    const itens = await this.prisma.itemPedido.findMany({
      where: { pedido: { clienteId } },
      select: {
        servicoId: true,
        preco: true,
        servico: {
          select: {
            id: true, codigo: true, nome: true, categoria: true,
            precoBase: true, precoRotina: true, precoPesquisa: true,
          },
        },
        pedido: { select: { createdAt: true } },
      },
      orderBy: { pedido: { createdAt: 'desc' } },
      distinct: ['servicoId'],
      take: 20,
    });

    return itens.map((i) => ({
      ...i.servico,
      precoBase:      Number(i.servico.precoBase),
      precoRotina:    Number(i.servico.precoRotina),
      precoPesquisa:  Number(i.servico.precoPesquisa),
      ultimoPreco:    Number(i.preco),
      ultimoPedidoEm: i.pedido.createdAt,
    }));
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
