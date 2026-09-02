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
  // Etiqueta gerada direto na OS (fluxo da Entrada) não tem amostra — o
  // cliente e a referência vêm da própria OS.
  ordemServico: {
    select: {
      id: true,
      numero: true,
      seq: true,
      cliente: { select: { id: true, nome: true, nomeFantasia: true } },
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
  // A coloração precisa sair na etiqueta (pedido do Célio). Reconhece as
  // colorações mais usadas pelo nome do serviço; se não bater, fica em branco
  // (editável na conferência).
  private sugerirColoracao(nome: string): string {
    const n = nome.toUpperCase();
    // HE (Hematoxilina-Eosina) — evita casar dentro de outras palavras.
    if (/(^|[^A-Z])H\.?E([^A-Z]|$)/.test(n)) return '.HE';
    if (n.includes('PAS')) return 'PAS';
    if (n.includes('ALCIAN') || /(^|[^A-Z])AB([^A-Z]|$)/.test(n)) return 'Alcian Blue';
    if (n.includes('MASSON') || n.includes('TRICR')) return 'Tricrômico';
    if (n.includes('GIEMSA')) return 'Giemsa';
    if (n.includes('GROCOTT') || n.includes('GOMORI')) return 'Grocott';
    if (n.includes('ZIEHL') || n.includes('BAAR')) return 'Ziehl-Neelsen';
    if (n.includes('PERLS') || n.includes('FERRO')) return 'Perls';
    if (n.includes('CONGO')) return 'Vermelho Congo';
    if (n.includes('RETICUL') || n.includes('GOMORI RET')) return 'Reticulina';
    if (n.includes('TRICROMICO') || n.includes('GOMORI TRIC')) return 'Tricrômico';
    if (n.includes('WARTHIN') || n.includes('STARRY')) return 'Warthin-Starry';
    if (n.includes('FONTANA')) return 'Fontana-Masson';
    if (n.includes('MUCICARMIN')) return 'Mucicarmin';
    if (n.includes('GRAM')) return 'Gram';
    if (n.includes('TOLUIDINA')) return 'Azul de Toluidina';
    if (n.includes('PICROSIRIUS') || n.includes('SIRIUS')) return 'Picrosirius';
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

  /**
   * Gera etiquetas de cassete direto na OS (fluxo da Entrada): uma por posição,
   * cada uma com a identificação do cliente digitada na tela de Serviços.
   * Entram na mesma conferência de saída das etiquetas de amostra.
   */
  async gerarParaOS(osId: number, dto: { identificacoes: string[]; tipo?: string }) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      select: {
        id: true,
        numero: true,
        seq: true,
        cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        amostra: { select: { pedido: { select: { cliente: { select: { id: true, nome: true, nomeFantasia: true } } } } } },
      },
    });
    if (!os) throw new NotFoundException(`OS #${osId} não encontrada.`);
    const cliente = os.cliente ?? os.amostra?.pedido.cliente;
    if (!cliente) throw new NotFoundException(`OS #${osId} não tem cliente para etiquetar.`);

    const idents = (dto.identificacoes ?? []).map((i) => (i ?? '').trim());
    if (idents.length === 0) throw new NotFoundException('Informe ao menos uma identificação.');

    // continua a sequência de cassetes já gerados nesta OS
    const jaExistentes = await this.prisma.etiqueta.count({ where: { ordemServicoId: os.id } });
    const numeros = await this.gerarNumeros(idents.length);
    const osRef = os.seq != null ? `OS${os.seq}` : os.numero.replace(/[^A-Za-z0-9-]/g, '');
    const clienteLabel = cliente.nomeFantasia ?? cliente.nome;

    const criadas = await this.prisma.$transaction(
      numeros.map((numero, i) => {
        const laminaSeq = jaExistentes + i + 1;
        // mesmo desenho do código composto da amostra: cliente + referência + seq + nº global
        const codigo = `${cliente.id}-${osRef}-C${laminaSeq}-${numero}`;
        return this.prisma.etiqueta.create({
          data: {
            ordemServicoId: os.id,
            numero,
            codigo,
            tipo: dto.tipo ?? 'cassete',
            identificacao: idents[i] || clienteLabel,
            laminaSeq,
          },
          include: INCLUDE_ETIQUETA,
        });
      }),
    );
    return { message: `${criadas.length} etiqueta(s) gerada(s) para a OS ${os.numero}.`, etiquetas: criadas };
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
            amostra: { select: { id: true, numeroInterno: true, numeroCliente: true } },
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
          select: { id: true, numeroInterno: true, numeroCliente: true },
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
        // Identificação da etiqueta = rótulo do cliente + código interno do
        // cliente para a amostra (numeroCliente), quando já informado. Ex.: a
        // guia/código que a Alkm Pet mandou para aquele cassete.
        identificacao: [clienteLabel, amostra.numeroCliente].filter(Boolean).join(' '),
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
    if (filter.ordemServicoId) where.ordemServicoId = filter.ordemServicoId;
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
