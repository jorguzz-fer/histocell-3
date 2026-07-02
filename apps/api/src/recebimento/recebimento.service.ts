import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { EtiquetasService } from '../etiquetas/etiquetas.service';
import { OrdensService } from '../ordens/ordens.service';
import { ReceberPedidoDto } from './dto/receber-pedido.dto';
import { EntradaRecepcaoDto } from './dto/entrada-recepcao.dto';
import { UpdateAmostraDto } from './dto/update-amostra.dto';
import { FilterAmostraDto } from './dto/filter-amostra.dto';
import { AuditService } from '../common/audit.service';

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

    // ── OS automática: 1 ordem de serviço por amostra designada (Célio) ─────────
    // Nasce em_andamento na Macroscopia (aparece na Fila). Best-effort: falha
    // na criação da OS não bloqueia o recebimento.
    let ordensGeradas = 0;
    for (const amostra of amostrasCreated) {
      try {
        await this.ordens.criarAuto(amostra.id, 'macroscopia', {
          prioridade: pedido.urgente ? 'urgente' : 'normal',
          responsavel: dto.recebidoPor,
          userId,
        });
        ordensGeradas += 1;
      } catch {
        /* segue sem bloquear */
      }
    }

    // ── Conferência: previsto x recebido ──────────────────────────────────────
    const recebida = amostrasCreated.length;
    const somaItens = pedido.itens.reduce((s, i) => s + i.quantidade, 0);
    const prevista =
      dto.qtdPrevista != null && dto.qtdPrevista >= 0 ? dto.qtdPrevista : somaItens;
    const diferenca = recebida - prevista;
    const excedente = diferenca > 0;
    // Gate da Spec 1A: qualquer divergência (mais OU menos) cai em aprovação da gerência.
    const divergente = diferenca !== 0;
    const novoStatus = divergente ? 'recebido_pendente_aprovacao' : 'recebido';

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
        status: novoStatus,
        dataRecebimento: agora,
        qtdPrevista: prevista,
        qtdRecebida: recebida,
        excedente,
        contagemDivergente: divergente,
        observacoes: observacoes || undefined,
      },
    });

    await this.audit.log(
      userId,
      divergente ? 'RECEBIDO_PENDENTE_APROVACAO' : 'RECEBIDO',
      'Pedido',
      dto.pedidoId,
      {
        prevista,
        recebida,
        diferenca,
        excedente,
        divergente,
        amostrasIds: amostrasCreated.map((a) => a.id),
      },
    );

    // ── Abatimento automático do crédito pré-pago (se houver e não pago adiantado) ──
    // Só abate se o pedido ficou em status final 'recebido' (sem pendência de aprovação).
    let credito: { abatido: number; saldo: number } | null = null;
    if (!divergente && !pedido.pagamentoAdiantado) {
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
      message: divergente
        ? `${recebida} amostra(s) registrada(s). Contagem prevista (${prevista}) diverge — pedido aguarda aprovação da gerência.`
        : `${recebida} amostra(s) registrada(s). Pedido #${dto.pedidoId} marcado como recebido.`,
      amostras: amostrasCreated,
      etiquetasGeradas,
      ordensGeradas, // OS criadas automaticamente (1 por amostra)
      conferencia: { prevista, recebida, diferenca, excedente },
      credito, // { abatido, saldo } quando consumiu crédito; senão null
      divergente,
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
