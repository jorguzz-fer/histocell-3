import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { GerarEtiquetasDto } from './dto/gerar-etiquetas.dto';
import { FilterEtiquetaDto } from './dto/filter-etiqueta.dto';
import { GerarLoteDto } from './dto/gerar-lote.dto';

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

  // ── número interno Histocell da amostra (sequencial contínuo, ex: 00045) ───────
  private async gerarNumeroInterno(): Promise<string> {
    const rows = await this.prisma.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('histocell_amostra_numero_seq') AS nextval`,
    );
    return String(Number(rows[0].nextval)).padStart(5, '0');
  }

  // ── Coloração sugerida a partir do nome do serviço ────────────────────────────
  private sugerirColoracao(nome: string): string {
    const n = nome.toUpperCase();
    if (/(^|[^A-Z])HE([^A-Z]|$)/.test(n)) return '.HE';
    if (n.includes('PAS')) return 'PAS';
    return '';
  }

  // ── Gera N etiquetas para uma amostra (núcleo reutilizável) ────────────────────
  private async gerarParaAmostra(dto: {
    amostraId: number;
    tipo: string;
    quantidade: number;
    coloracao?: string;
    identificacao?: string;
  }) {
    if (dto.quantidade < 1) return [];

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

    return this.prisma.$transaction(
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
  }

  // ── Gera N etiquetas para uma amostra ─────────────────────────────────────────
  async gerar(dto: GerarEtiquetasDto) {
    const criadas = await this.gerarParaAmostra(dto);
    const numeroInterno = criadas[0]?.amostra?.numeroInterno;
    return {
      message: `${criadas.length} etiqueta(s) gerada(s)${
        numeroInterno ? ` para a amostra ${numeroInterno}` : ''
      }.`,
      etiquetas: criadas,
    };
  }

  // ── Gera etiquetas para várias amostras (conferência do pedido) ───────────────
  async gerarLote(dto: GerarLoteDto) {
    const todas: Awaited<ReturnType<typeof this.gerarParaAmostra>> = [];
    for (const linha of dto.linhas) {
      const criadas = await this.gerarParaAmostra(linha);
      todas.push(...criadas);
    }
    todas.sort((a, b) => a.numero - b.numero);
    return {
      message: `${todas.length} etiqueta(s) gerada(s).`,
      etiquetas: todas,
    };
  }

  // ── Prepara a conferência de etiquetas de um pedido ───────────────────────────
  // Cria uma amostra por item (idempotente via itemPedidoId) e devolve as linhas
  // com sugestões editáveis (identificação, coloração, tipo, quantidade).
  async prepararPedido(pedidoId: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        cliente: {
          select: { id: true, nome: true, nomeFantasia: true, idEtiqueta: true },
        },
        itens: {
          include: {
            servico: { select: { nome: true, codigo: true, geraEtiqueta: true } },
            amostra: { select: { id: true, numeroInterno: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} não encontrado.`);

    const clienteLabel =
      pedido.cliente.idEtiqueta || pedido.cliente.nomeFantasia || pedido.cliente.nome;
    const agora = new Date();

    const linhas: any[] = [];
    for (const item of pedido.itens) {
      // cria a amostra para o item se ainda não existir (idempotente)
      let amostra = item.amostra;
      if (!amostra) {
        const numeroInterno = await this.gerarNumeroInterno();
        amostra = await this.prisma.amostra.create({
          data: {
            pedidoId: pedido.id,
            itemPedidoId: item.id,
            numeroInterno,
            especie: 'A definir',
            material: 'A definir',
            status: 'pendente',
            dataRecebimento: agora,
            observacoes: `Serviço: ${item.servico.nome} — amostra criada na emissão de etiquetas.`,
          },
          select: { id: true, numeroInterno: true },
        });
      }

      const jaGeradas = await this.prisma.etiqueta.count({
        where: { amostraId: amostra.id },
      });

      const geraEtiqueta = item.servico.geraEtiqueta !== false
      linhas.push({
        amostraId: amostra.id,
        numeroInterno: amostra.numeroInterno,
        itemPedidoId: item.id,
        servicoNome: item.servico.nome,
        servicoCodigo: item.servico.codigo,
        quantidadeItem: item.quantidade,
        jaGeradas,
        geraEtiqueta,
        // sugestões editáveis na tela de conferência
        tipo: 'lamina',
        // serviço que não etiqueta entra com 0 sugerido (mas continua editável)
        quantidade: geraEtiqueta ? Math.max(0, item.quantidade - jaGeradas) : 0,
        coloracao: this.sugerirColoracao(item.servico.nome),
        identificacao: clienteLabel,
      });
    }

    // amostras passaram a existir → tira o pedido da fila de recebimento
    if (['enviado', 'rascunho'].includes(pedido.status)) {
      await this.prisma.pedido.update({
        where: { id: pedido.id },
        data: { status: 'recebido', dataRecebimento: pedido.dataRecebimento ?? agora },
      });
    }

    return {
      pedido: {
        id: pedido.id,
        numero: pedido.numero,
        clienteNome: pedido.cliente.nomeFantasia ?? pedido.cliente.nome,
      },
      linhas,
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
