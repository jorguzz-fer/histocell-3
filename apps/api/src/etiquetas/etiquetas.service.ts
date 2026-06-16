import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { GerarEtiquetasDto } from './dto/gerar-etiquetas.dto';
import { FilterEtiquetaDto } from './dto/filter-etiqueta.dto';

// ─── include padrão ────────────────────────────────────────────────────────────

const INCLUDE_ETIQUETA = {
  amostra: {
    select: {
      id: true,
      numeroInterno: true,
      numeroCliente: true,
      especie: true,
      material: true,
      pedido: {
        select: {
          numero: true,
          cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class EtiquetasService {
  constructor(private prisma: PrismaService) {}

  // ── número sequencial global da etiqueta (ex: 1384126) ────────────────────────
  private async gerarNumeros(quantidade: number): Promise<number[]> {
    const rows = await this.prisma.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('histocell_etiqueta_numero_seq') AS nextval FROM generate_series(1, $1)`,
      quantidade,
    );
    return rows.map((r) => Number(r.nextval));
  }

  // ── Gera N etiquetas para uma amostra ─────────────────────────────────────────
  async gerar(dto: GerarEtiquetasDto) {
    const amostra = await this.prisma.amostra.findUnique({
      where: { id: dto.amostraId },
      select: {
        id: true,
        numeroInterno: true,
        pedido: {
          select: {
            cliente: { select: { id: true, nome: true, nomeFantasia: true } },
          },
        },
      },
    });
    if (!amostra) {
      throw new NotFoundException(`Amostra #${dto.amostraId} não encontrada.`);
    }

    const cliente = amostra.pedido.cliente;
    const clienteLabel = cliente.nomeFantasia ?? cliente.nome;
    // base do código de barras: cliente + nº Histocell (apenas alfanumérico/traço)
    const histocell = amostra.numeroInterno.replace(/[^A-Za-z0-9-]/g, '');

    // continua a sequência de lâminas/cassetes já existentes nesta amostra
    const jaExistentes = await this.prisma.etiqueta.count({
      where: { amostraId: amostra.id },
    });

    const numeros = await this.gerarNumeros(dto.quantidade);

    const criadas = await this.prisma.$transaction(
      numeros.map((numero, i) => {
        const laminaSeq = jaExistentes + i + 1;
        const identificacao = dto.identificacao
          ? `${dto.identificacao} ${laminaSeq}`
          : clienteLabel;
        // código composto (cliente + Histocell + lâmina + nº global, único)
        const codigo = `${cliente.id}-${histocell}-L${laminaSeq}-${numero}`;
        return this.prisma.etiqueta.create({
          data: {
            amostraId: amostra.id,
            numero,
            codigo,
            tipo: dto.tipo,
            coloracao: dto.coloracao,
            identificacao,
            laminaSeq,
          },
          include: INCLUDE_ETIQUETA,
        });
      }),
    );

    return {
      message: `${criadas.length} etiqueta(s) gerada(s) para a amostra ${amostra.numeroInterno}.`,
      etiquetas: criadas,
    };
  }

  // ── Lista paginada com filtros ────────────────────────────────────────────────
  async findAll(filter: FilterEtiquetaDto) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.amostraId) where.amostraId = filter.amostraId;
    if (filter.impresso === 'true') where.impresso = true;
    if (filter.impresso === 'false') where.impresso = false;
    if (filter.busca) {
      const numeroBusca = parseInt(filter.busca.replace(/\D/g, ''), 10);
      where.OR = [
        { codigo: { contains: filter.busca, mode: 'insensitive' } },
        { identificacao: { contains: filter.busca, mode: 'insensitive' } },
        { coloracao: { contains: filter.busca, mode: 'insensitive' } },
        { amostra: { numeroInterno: { contains: filter.busca, mode: 'insensitive' } } },
        { amostra: { numeroCliente: { contains: filter.busca, mode: 'insensitive' } } },
        {
          amostra: {
            pedido: { cliente: { nome: { contains: filter.busca, mode: 'insensitive' } } },
          },
        },
        {
          amostra: {
            pedido: {
              cliente: { nomeFantasia: { contains: filter.busca, mode: 'insensitive' } },
            },
          },
        },
        ...(Number.isFinite(numeroBusca) && numeroBusca > 0 ? [{ numero: numeroBusca }] : []),
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.etiqueta.count({ where }),
      this.prisma.etiqueta.findMany({
        where,
        include: INCLUDE_ETIQUETA,
        orderBy: { numero: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Etiquetas de uma amostra ──────────────────────────────────────────────────
  async findByAmostra(amostraId: number) {
    return this.prisma.etiqueta.findMany({
      where: { amostraId },
      include: INCLUDE_ETIQUETA,
      orderBy: { laminaSeq: 'asc' },
    });
  }

  // ── Amostras com contagem de etiquetas (seletor de geração) ───────────────────
  async listarAmostras(busca?: string) {
    const where: any = {};
    if (busca) {
      where.OR = [
        { numeroInterno: { contains: busca, mode: 'insensitive' } },
        { numeroCliente: { contains: busca, mode: 'insensitive' } },
        { pedido: { numero: { contains: busca, mode: 'insensitive' } } },
        { pedido: { cliente: { nome: { contains: busca, mode: 'insensitive' } } } },
        { pedido: { cliente: { nomeFantasia: { contains: busca, mode: 'insensitive' } } } },
      ];
    }

    const amostras = await this.prisma.amostra.findMany({
      where,
      select: {
        id: true,
        numeroInterno: true,
        numeroCliente: true,
        especie: true,
        material: true,
        pedido: {
          select: {
            numero: true,
            cliente: { select: { id: true, nome: true, nomeFantasia: true } },
          },
        },
        etiquetas: { select: { impresso: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return amostras.map((a) => {
      const total = a.etiquetas.length;
      const impressas = a.etiquetas.filter((e) => e.impresso).length;
      const { etiquetas, ...rest } = a;
      return { ...rest, totalEtiquetas: total, etiquetasImpressas: impressas };
    });
  }

  // ── Marca lote como impresso ──────────────────────────────────────────────────
  async imprimir(ids: number[]) {
    const result = await this.prisma.etiqueta.updateMany({
      where: { id: { in: ids } },
      data: { impresso: true, impressoEm: new Date() },
    });
    return { message: `${result.count} etiqueta(s) marcada(s) como impressa(s).`, count: result.count };
  }

  // ── Remove uma etiqueta ───────────────────────────────────────────────────────
  async remover(id: number) {
    const etiqueta = await this.prisma.etiqueta.findUnique({ where: { id } });
    if (!etiqueta) throw new NotFoundException(`Etiqueta #${id} não encontrada.`);
    await this.prisma.etiqueta.delete({ where: { id } });
    return { message: `Etiqueta ${etiqueta.numero} removida.` };
  }
}
