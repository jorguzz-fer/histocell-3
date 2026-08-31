import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { EtiquetasService } from '../etiquetas/etiquetas.service';
import { OrdensService } from '../ordens/ordens.service';
import { ReceberPedidoDto } from './dto/receber-pedido.dto';
import { EntradaRecepcaoDto } from './dto/entrada-recepcao.dto';
import {
  CONDICAO_ETAPA,
  EntradaAvulsaDto,
  FilterEntradaDto,
  VincularEntradaDto,
} from './dto/entrada-avulsa.dto';
import { UpdateAmostraDto } from './dto/update-amostra.dto';
import { FilterAmostraDto } from './dto/filter-amostra.dto';
import { AuditService } from '../common/audit.service';

// Divergência de contagem acima deste percentual (pra mais OU pra menos) segura
// o pedido para aprovação da gerência antes de entrar no laboratório (regra Célio).
const LIMITE_APROVACAO_PCT = 0.1; // 10%

// ─── include padrão de amostra ────────────────────────────────────────────────

const INCLUDE_AMOSTRA = {
  pedido: {
    select: {
      id: true,
      numero: true,
      seq: true,
      cliente: { select: { id: true, nome: true, nomeFantasia: true } },
    },
  },
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class RecebimentoService {
  constructor(
    private prisma: PrismaService,
    private ordens: OrdensService,
    private audit: AuditService,
    private financeiro: FinanceiroService,
    private etiquetas: EtiquetasService,
  ) {}

  // ── número interno Histocell: sequencial contínuo (não reinicia por dia) ──────
  private async gerarNumeroInterno(): Promise<string> {
    const rows = await this.prisma.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('histocell_amostra_numero_seq') AS nextval`,
    );
    return String(Number(rows[0].nextval)).padStart(5, '0');
  }

  // ── Fila por filtro (com recipientes) ─────────────────────────────────────────
  private async filaPorWhere(where: any) {
    const pedidos = await this.prisma.pedido.findMany({
      where,
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
      // Código curto p/ exibição (ex.: "#0042"); cai no número completo se sem seq.
      codigoCurto: p.seq != null ? `#${String(p.seq).padStart(4, '0')}` : p.numero,
    }));
  }

  /** Etapa 1 — Recepção: orçamentos aguardando entrada.
   *  - Admin (origem 'local'): entram mesmo como rascunho — orçamento criado no
   *    admin já aparece no recebimento sem precisar "enviar".
   *  - Portal (origem 'web'): só quando enviados (rascunhos do cliente não
   *    poluem a recepção). */
  async filaRecepcao() {
    return this.filaPorWhere({
      // Orçamento aguardando o cliente aprovar não entra na Recepção.
      aprovacaoCliente: { not: 'pendente' },
      OR: [{ status: 'enviado' }, { status: 'rascunho', origem: 'local' }],
    });
  }
  /** Etapa 2 — Laboratório: pedidos com entrada feita, aguardando identificação */
  async filaLaboratorio() { return this.filaPorWhere({ status: 'recepcao' }); }
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
  // Cada unidade vira um Recipiente (quantidade 1) com seu próprio código de barras,
  // para que a recepção já imprima uma etiqueta por recipiente físico.
  async registrarEntrada(dto: EntradaRecepcaoDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      select: { id: true, numero: true, status: true },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${dto.pedidoId} não encontrado.`);
    if (!['enviado', 'rascunho'].includes(pedido.status)) {
      throw new BadRequestException(
        `Pedido está em "${pedido.status}" e não pode registrar entrada agora.`,
      );
    }

    // continua a numeração de recipientes já existentes neste pedido
    let seq = await this.prisma.recipiente.count({ where: { pedidoId: dto.pedidoId } });

    const novos: {
      pedidoId: number;
      tipo: string;
      quantidade: number;
      codigo: string;
      observacoes?: string;
      recebidoPor?: string;
    }[] = [];
    for (const r of dto.recipientes) {
      for (let i = 0; i < r.quantidade; i++) {
        seq++;
        novos.push({
          pedidoId: dto.pedidoId,
          tipo: r.tipo,
          quantidade: 1,
          codigo: `REC-${pedido.numero}-${String(seq).padStart(2, '0')}`,
          observacoes: r.observacoes,
          recebidoPor: dto.recebidoPor,
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.recipiente.createMany({ data: novos }),
      this.prisma.pedido.update({
        where: { id: dto.pedidoId },
        data: { status: 'recepcao', dataRecepcao: new Date() },
      }),
    ]);

    return {
      message: `Entrada registrada (${novos.length} recipiente(s)). Pedido enviado ao Laboratório.`,
      total: novos.length,
    };
  }

  // ── Entrada avulsa (tela Entrada) ────────────────────────────────────────────
  // A recepção só identifica o cliente e o que chegou; o orçamento pode nem
  // existir ainda. Cada volume vira um Recipiente ligado ao cliente (sem pedido)
  // com seu próprio código de barras, para a etiqueta ser colada na hora.

  /** Código do volume de entrada (ENT-000001). Sequence global, sem colisão. */
  private async gerarCodigoEntrada(): Promise<string> {
    const rows = await this.prisma.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('histocell_entrada_numero_seq') AS nextval`,
    );
    return `ENT-${String(Number(rows[0].nextval)).padStart(6, '0')}`;
  }

  async registrarEntradaAvulsa(dto: EntradaAvulsaDto, userId?: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
      select: { id: true, nome: true, nomeFantasia: true, ativo: true },
    });
    if (!cliente) throw new NotFoundException(`Cliente #${dto.clienteId} não encontrado.`);
    if (!cliente.ativo) throw new BadRequestException('Cliente está inativo.');

    const novos: {
      clienteId: number;
      tipo: string;
      condicao: string;
      quantidade: number;
      codigo: string;
      observacoes?: string;
      recebidoPor?: string;
    }[] = [];
    for (const r of dto.recipientes) {
      for (let i = 0; i < r.quantidade; i++) {
        novos.push({
          clienteId: cliente.id,
          tipo: r.tipo,
          condicao: r.condicao,
          quantidade: 1,
          codigo: await this.gerarCodigoEntrada(),
          observacoes: r.observacoes,
          recebidoPor: dto.recebidoPor,
        });
      }
    }

    // create um a um (e não createMany) porque a tela precisa dos ids de volta
    // para abrir a impressão das etiquetas recém-criadas.
    const criados = await this.prisma.$transaction(
      novos.map((data) => this.prisma.recipiente.create({ data, select: { id: true } })),
    );

    // A entrada abre a OS: é dela que o trabalho parte. Uma OS por entrada,
    // então quando chega material molhado E seco junto, a OS começa na etapa
    // mais atrasada do fluxo (Macroscopia) — nenhum volume pode pular uma etapa
    // que ainda precisa acontecer com ele.
    const temMolhado = dto.recipientes.some((r) => r.condicao === 'molhado');
    const etapaInicial = temMolhado ? CONDICAO_ETAPA.molhado : CONDICAO_ETAPA.seco;
    const os = await this.ordens.criarDaEntrada(cliente.id, etapaInicial, {
      recipienteIds: criados.map((c) => c.id),
      responsavel: dto.recebidoPor,
      userId,
    });

    return {
      message: `Entrada registrada (${criados.length} volume(s)). OS ${os.numero} aberta.`,
      total: criados.length,
      ids: criados.map((c) => c.id),
      ordemServico: { id: os.id, numero: os.numero, seq: os.seq, etapaAtual: os.etapaAtual },
    };
  }

  /** Entradas avulsas: pendentes de vínculo, ou as dos últimos N dias. */
  async entradasAvulsas(filter: FilterEntradaDto) {
    const where: any = { clienteId: { not: null } };
    if (filter.pendentes) {
      where.pedidoId = null;
    } else {
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);
      desde.setDate(desde.getDate() - ((filter.dias ?? 1) - 1));
      where.createdAt = { gte: desde };
    }

    const recipientes = await this.prisma.recipiente.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        pedido: { select: { id: true, numero: true, seq: true } },
        ordemServico: { select: { id: true, numero: true, seq: true, etapaAtual: true, status: true } },
        amostras: { select: { id: true } },
      },
    });

    return recipientes.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      condicao: r.condicao,
      codigo: r.codigo,
      observacoes: r.observacoes,
      recebidoPor: r.recebidoPor,
      createdAt: r.createdAt,
      clienteId: r.clienteId,
      clienteNome: r.cliente?.nome ?? '',
      clienteNomeFantasia: r.cliente?.nomeFantasia ?? null,
      vinculada: r.pedidoId != null,
      pedidoId: r.pedidoId,
      pedidoNumero: r.pedido?.numero ?? null,
      pedidoCodigoCurto:
        r.pedido == null
          ? null
          : r.pedido.seq != null
            ? `#${String(r.pedido.seq).padStart(4, '0')}`
            : r.pedido.numero,
      totalAmostras: r.amostras.length,
      ordemServicoId: r.ordemServicoId,
      osNumero: r.ordemServico?.numero ?? null,
      osCodigoCurto:
        r.ordemServico?.seq != null
          ? `#${String(r.ordemServico.seq).padStart(4, '0')}`
          : (r.ordemServico?.numero ?? null),
      // Para o guia da Entrada: em que fase a OS deste volume está agora.
      osEtapa: r.ordemServico?.etapaAtual ?? null,
      osStatus: r.ordemServico?.status ?? null,
    }));
  }

  /** Dados das etiquetas de entrada para a página de impressão. */
  async etiquetasEntrada(ids: number[]) {
    if (ids.length === 0) throw new BadRequestException('Informe ao menos um volume.');
    const recipientes = await this.prisma.recipiente.findMany({
      where: { id: { in: ids } },
      orderBy: { id: 'asc' },
      include: {
        cliente: { select: { id: true, nome: true, nomeFantasia: true, idEtiqueta: true } },
      },
    });
    if (recipientes.length === 0) throw new NotFoundException('Nenhum volume encontrado.');

    // A folha imprime o cabeçalho de um cliente só — misturar clientes numa
    // mesma impressão colaria etiqueta errada no volume.
    const clientes = new Set(recipientes.map((r) => r.clienteId ?? r.pedidoId));
    if (clientes.size > 1) {
      throw new BadRequestException('Selecione volumes de um mesmo cliente para imprimir.');
    }

    const primeiro = recipientes[0];
    return {
      cliente: primeiro.cliente,
      recebidoEm: primeiro.createdAt,
      volumes: recipientes.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        codigo: r.codigo,
        observacoes: r.observacoes,
      })),
    };
  }

  /** Vincula entradas avulsas a um pedido/orçamento do mesmo cliente. */
  async vincularEntrada(dto: VincularEntradaDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      select: { id: true, numero: true, clienteId: true },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${dto.pedidoId} não encontrado.`);

    const recipientes = await this.prisma.recipiente.findMany({
      where: { id: { in: dto.recipienteIds } },
      select: { id: true, clienteId: true, pedidoId: true },
    });
    if (recipientes.length !== dto.recipienteIds.length) {
      throw new NotFoundException('Algum volume informado não existe.');
    }
    const jaVinculado = recipientes.find((r) => r.pedidoId != null);
    if (jaVinculado) {
      throw new BadRequestException(`Volume #${jaVinculado.id} já está vinculado a um pedido.`);
    }
    // Vincular a um pedido de outro cliente trocaria o dono do material.
    const deOutroCliente = recipientes.find((r) => r.clienteId !== pedido.clienteId);
    if (deOutroCliente) {
      throw new BadRequestException(
        `Volume #${deOutroCliente.id} é de outro cliente — não pode entrar neste pedido.`,
      );
    }

    const { count } = await this.prisma.recipiente.updateMany({
      where: { id: { in: dto.recipienteIds } },
      data: { pedidoId: pedido.id },
    });

    return { message: `${count} volume(s) vinculado(s) ao pedido ${pedido.numero}.`, total: count };
  }

  /** Detalhe do pedido para impressão (etiquetas de recipiente + Ordem de Serviço). */
  async detalhePedido(pedidoId: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        cliente: { select: { id: true, nome: true, nomeFantasia: true, idEtiqueta: true } },
        itens: { include: { servico: { select: { nome: true, codigo: true } } } },
        recipientes: { orderBy: { id: 'asc' } },
        amostras: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            numeroInterno: true,
            numeroCliente: true,
            recipienteId: true,
            observacoes: true,
            itemPedidoId: true,
            // serviço vinculado diretamente à amostra (macroscopia: pote → cassetes)
            servico: { select: { nome: true, codigo: true } },
            // serviço de origem da amostra (quando criada via emissão de etiquetas)
            itemPedido: { select: { servico: { select: { nome: true, codigo: true } } } },
            // OS da amostra — a folha impressa carrega o código de barras dela,
            // que a bancada bipa na conferência de saída (carimbo de entrega).
            ordemServico: { select: { numero: true, seq: true } },
          },
        },
      },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} não encontrado.`);
    return {
      ...pedido,
      itens: pedido.itens.map((i) => ({ ...i, preco: Number(i.preco), desconto: Number(i.desconto) })),
    };
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
  async receberPedido(dto: ReceberPedidoDto, userId: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      select: {
        id: true,
        numero: true,
        clienteId: true,
        status: true,
        observacoes: true,
        pagamentoAdiantado: true,
        urgente: true,
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
          recipienteId: item.recipienteId,
          servicoId: item.servicoId,
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

    // ── Etiqueta de nível 2: 1 lâmina por amostra designada (Célio) ─────────────
    // Best-effort: falha na emissão não bloqueia o recebimento.
    let etiquetasGeradas = 0;
    for (const amostra of amostrasCreated) {
      try {
        const res = await this.etiquetas.gerar({
          amostraId: amostra.id,
          tipo: 'lamina',
          quantidade: 1,
          identificacao: amostra.numeroCliente || undefined,
        });
        etiquetasGeradas += res.etiquetas.length;
      } catch {
        /* segue sem bloquear */
      }
    }

    // ── Conferência: previsto x recebido ──────────────────────────────────────
    // Recebida = valor informado na conferência (quando enviado); senão, o nº
    // de amostras efetivamente registradas.
    const recebida =
      dto.qtdRecebida != null && dto.qtdRecebida >= 0
        ? dto.qtdRecebida
        : amostrasCreated.length;
    const somaItens = pedido.itens.reduce((s, i) => s + i.quantidade, 0);
    const prevista =
      dto.qtdPrevista != null && dto.qtdPrevista >= 0 ? dto.qtdPrevista : somaItens;
    const diferenca = recebida - prevista;
    const excedente = diferenca > 0;
    const contagemDivergente = diferenca !== 0;
    // Regra Célio: só divergências ACIMA de 10% (pra mais ou pra menos) seguram
    // o pedido para aprovação da gerência. Até 10% segue direto para o laboratório.
    const percentualDiverg =
      prevista > 0 ? Math.abs(diferenca) / prevista : recebida > 0 ? 1 : 0;
    const precisaAprovacao = percentualDiverg > LIMITE_APROVACAO_PCT;
    const novoStatus = precisaAprovacao ? 'recebido_pendente_aprovacao' : 'recebido';
    const pctStr = `${Math.round(percentualDiverg * 100)}%`;

    // Notas de conferência (automática + manual)
    const dataStr = agora.toLocaleDateString('pt-BR');
    const notas: string[] = [];
    if (excedente) {
      notas.push(
        `[Conferência ${dataStr}] Recebidas ${recebida} amostra(s) vs ${prevista} prevista(s) — ` +
          `${diferenca} a mais (${pctStr}).${precisaAprovacao ? ' Aguardando aprovação da gerência.' : ' Verificar cobrança do excedente.'}`,
      );
    } else if (diferenca < 0) {
      notas.push(
        `[Conferência ${dataStr}] Recebidas ${recebida} amostra(s) vs ${prevista} prevista(s) — ` +
          `${Math.abs(diferenca)} a menos (${pctStr}).${precisaAprovacao ? ' Aguardando aprovação da gerência.' : ''}`,
      );
    }
    if (dto.observacaoConferencia?.trim()) {
      notas.push(`[Conferência ${dataStr}] ${dto.observacaoConferencia.trim()}`);
    }
    const observacoes = [pedido.observacoes, ...notas].filter(Boolean).join('\n');

    await this.prisma.pedido.update({
      where: { id: dto.pedidoId },
      data: {
        status: novoStatus,
        dataRecebimento: agora,
        qtdPrevista: prevista,
        qtdRecebida: recebida,
        excedente,
        contagemDivergente,
        observacoes: observacoes || undefined,
      },
    });

    await this.audit.log(
      userId,
      precisaAprovacao ? 'RECEBIDO_PENDENTE_APROVACAO' : 'RECEBIDO',
      'Pedido',
      dto.pedidoId,
      {
        prevista,
        recebida,
        diferenca,
        excedente,
        divergente: contagemDivergente,
        percentual: percentualDiverg,
        precisaAprovacao,
        amostrasIds: amostrasCreated.map((a) => a.id),
      },
    );

    // ── OS automática + abatimento de crédito ──────────────────────────────────
    // Só quando o pedido NÃO precisa de aprovação. Se precisa (>10%), a OS e o
    // abatimento acontecem em pedidos.aprovarDivergencia (após liberação).
    let ordensGeradas = 0;
    let ordensFalhas = 0;
    let credito: { abatido: number; saldo: number } | null = null;
    if (!precisaAprovacao) {
      const res = await this.ordens.criarAutoParaPedido(dto.pedidoId, {
        prioridade: pedido.urgente ? 'urgente' : 'normal',
        responsavel: dto.recebidoPor,
        userId,
      });
      ordensGeradas = res.criadas;
      ordensFalhas = res.falhas;

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
    }

    const avisoFalha =
      ordensFalhas > 0
        ? ` ⚠️ ${ordensFalhas} Ordem(ns) de Serviço não puderam ser criadas — verifique a Fila.`
        : '';

    return {
      message: precisaAprovacao
        ? `${amostrasCreated.length} amostra(s) registrada(s). Conferência ${recebida}×${prevista} diverge ${pctStr} (> 10%) — pedido aguarda aprovação da gerência.`
        : `${amostrasCreated.length} amostra(s) registrada(s). Pedido #${dto.pedidoId} marcado como recebido.${avisoFalha}`,
      amostras: amostrasCreated,
      etiquetasGeradas,
      ordensGeradas, // OS criadas automaticamente (1 por amostra)
      ordensFalhas, // OS que falharam ao ser criadas (0 = tudo certo)
      conferencia: { prevista, recebida, diferenca, excedente, percentual: percentualDiverg },
      credito, // { abatido, saldo } quando consumiu crédito; senão null
      precisaAprovacao,
      divergente: contagemDivergente,
    };
  }

  // Enquanto a triagem está aberta (antes de identificar/gerar OS), amostras e
  // recipientes podem ser editados. Depois de finalizada, ficam travados — só a
  // gerência reabre (evita outro setor mudar tipo/serviço com a OS já emitida).
  private garantirTriagemAberta(status: string, role?: string) {
    const TRIAGEM_ABERTA = ['rascunho', 'enviado', 'recepcao'];
    if (role === 'gerencia') return;
    if (!TRIAGEM_ABERTA.includes(status)) {
      throw new BadRequestException(
        'Triagem já finalizada — o pedido saiu da recepção/laboratório. Só a gerência pode alterar agora.',
      );
    }
  }

  // ── Atualizar amostra ──────────────────────────────────────────────────────────
  async updateAmostra(id: number, dto: UpdateAmostraDto, role?: string) {
    const amostra = await this.prisma.amostra.findUnique({
      where: { id },
      select: { id: true, pedido: { select: { status: true } } },
    });
    if (!amostra) throw new NotFoundException(`Amostra #${id} não encontrada.`);
    this.garantirTriagemAberta(amostra.pedido.status, role);
    const updated = await this.prisma.amostra.update({
      where: { id },
      data: { ...dto },
      include: INCLUDE_AMOSTRA,
    });
    return updated;
  }

  // ── Trocar o tipo do recipiente (macroscopia: "Pote" → "Cassete") ───────────────
  // A recepção registra só o recipiente externo (ex.: 1 pote); ao abrir, a
  // macroscopia pode reclassificá-lo antes de identificar as amostras.
  async atualizarRecipiente(id: number, dto: { tipo?: string; observacoes?: string }, role?: string) {
    const rec = await this.prisma.recipiente.findUnique({
      where: { id },
      select: { id: true, pedido: { select: { status: true } } },
    });
    if (!rec) throw new NotFoundException(`Recipiente #${id} não encontrado.`);
    // Entrada avulsa ainda sem pedido: não há triagem para travar, a recepção
    // pode corrigir o tipo livremente até vincular.
    if (rec.pedido) this.garantirTriagemAberta(rec.pedido.status, role);
    const data: { tipo?: string; observacoes?: string } = {};
    if (dto.tipo != null && dto.tipo.trim()) data.tipo = dto.tipo.trim();
    if (dto.observacoes != null) data.observacoes = dto.observacoes;
    return this.prisma.recipiente.update({ where: { id }, data });
  }
}
