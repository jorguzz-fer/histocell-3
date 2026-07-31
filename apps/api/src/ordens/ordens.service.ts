import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateOrdemDto } from './dto/create-ordem.dto';
import { UpdateOrdemDto } from './dto/update-ordem.dto';
import { FilterOrdemDto } from './dto/filter-ordem.dto';
import {
  ETAPAS_ORDEM,
  ETAPAS_MOVIVEIS,
  ETAPAS_TERMINAIS,
  ETAPA_LABEL,
  ETAPA_PARA_DEPARTAMENTO,
  type EtapaOrdem,
} from './etapas';

// ─── constantes ───────────────────────────────────────────────────────────────

type Etapa = EtapaOrdem;

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function proximaEtapa(atual: Etapa): Etapa | null {
  const idx = ETAPAS_ORDEM.indexOf(atual);
  if (idx < 0) return ETAPAS_ORDEM[1] ?? null; // etapa desconhecida → segue p/ macroscopia
  return idx < ETAPAS_ORDEM.length - 1 ? ETAPAS_ORDEM[idx + 1] : null;
}

// ─── include padrão ───────────────────────────────────────────────────────────

const INCLUDE_OS = {
  amostra: {
    include: {
      pedido: {
        select: {
          id: true,
          numero: true,
          seq: true,
          cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        },
      },
    },
  },
  etapas: { orderBy: { id: 'asc' as const } },
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class OrdensService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /**
   * Espelha a etapa atual da OS no Rastreio das etiquetas da amostra, para que a
   * posição do material no "rastreio do pedido" acompanhe o avanço na Fila mesmo
   * quando não houve um scan físico de código de barras. Antes deste bridge, a
   * Fila (OrdemServico.etapaAtual) e o Rastreio (Etiqueta.departamentoAtual)
   * eram sistemas desacoplados: os itens corriam na Fila mas o rastreio do
   * pedido não entrava. Best-effort — nunca derruba o avanço da OS.
   */
  private async sincronizarRastreio(
    amostraId: number,
    etapa: EtapaOrdem,
    opts: { responsavel?: string; concluir?: boolean } = {},
  ) {
    try {
      const departamento = ETAPA_PARA_DEPARTAMENTO[etapa];
      if (!departamento) return;

      const etiquetas = await this.prisma.etiqueta.findMany({
        where: { amostraId },
        select: { id: true, departamentoAtual: true },
      });
      if (etiquetas.length === 0) return;

      const agora = new Date();
      const rastreioStatus = opts.concluir ? 'concluido' : 'em_andamento';
      const responsavel = opts.responsavel?.trim() || 'Sistema (Fila)';

      const ops: any[] = [];
      for (const et of etiquetas) {
        // Evita evento duplicado quando já está no mesmo departamento (a menos
        // que seja a conclusão, que registra a saída do fluxo).
        if (et.departamentoAtual !== departamento || opts.concluir) {
          ops.push(
            this.prisma.rastreioEvento.create({
              data: {
                etiquetaId: et.id,
                departamento,
                tipo: opts.concluir ? 'saida' : 'entrada',
                scannedPor: responsavel,
                observacoes: 'Sincronizado pelo avanço da OS na Fila',
              },
            }),
          );
        }
        ops.push(
          this.prisma.etiqueta.update({
            where: { id: et.id },
            data: {
              departamentoAtual: departamento,
              rastreioStatus,
              ultimoEventoEm: agora,
              ultimoResponsavel: responsavel,
            },
          }),
        );
      }
      await this.prisma.$transaction(ops);
    } catch {
      // Sincronização de rastreio é best-effort: não deve bloquear a OS.
    }
  }

  // ── número sequencial diário ─────────────────────────────────────────────────
  // Usa o MAIOR sufixo existente + 1 (não count+1): resiste a lacunas deixadas
  // por OS canceladas/removidas, evitando gerar um número já usado (P2002).
  private async gerarNumero(): Promise<string> {
    const hoje = toDateStr(new Date());
    const prefix = `OS-${hoje}-`;
    const existentes = await this.prisma.ordemServico.findMany({
      where: { numero: { startsWith: prefix } },
      select: { numero: true },
    });
    const maxSeq = existentes.reduce((max, o) => {
      const n = parseInt(o.numero.slice(prefix.length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  }

  /** Cria OS automaticamente para uma amostra (usado pelo Recebimento). */
  async criarAuto(
    amostraId: number,
    etapaInicial: string = 'macroscopia',
    opts: { prioridade?: string; responsavel?: string; userId?: number } = {},
  ) {
    const agora = new Date();
    const idxInicial = ETAPAS_ORDEM.indexOf(etapaInicial as Etapa);
    const dadosEtapas = ETAPAS_ORDEM.map((etapa, i) => {
      // Cria todas as etapas do fluxo (como no create manual) para que o
      // avançar registre iniciadoEm/concluidoEm de cada uma. As anteriores à
      // etapa inicial já nascem concluídas (foram puladas pelo recebimento).
      if (idxInicial >= 0 && i < idxInicial) {
        return { etapa, status: 'concluida', iniciadoEm: agora, concluidoEm: agora };
      }
      if (i === idxInicial) {
        return { etapa, status: 'em_andamento', iniciadoEm: agora };
      }
      return { etapa, status: 'pendente' };
    });

    // Retry curto em caso de colisão de número (P2002) sob concorrência:
    // gerarNumero relê o máximo a cada tentativa, então converge.
    let os: any;
    for (let tentativa = 0; ; tentativa++) {
      const numero = await this.gerarNumero();
      try {
        os = await this.prisma.ordemServico.create({
          data: {
            amostraId,
            numero,
            etapaAtual: etapaInicial,
            status: 'em_andamento',
            prioridade: opts.prioridade ?? 'normal',
            responsavel: opts.responsavel,
            iniciadoEm: agora,
            etapas: { create: dadosEtapas },
          },
        });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002' && tentativa < 4) continue;
        throw e;
      }
    }
    // amostra entra em processamento (a OS assumiu)
    await this.prisma.amostra.update({
      where: { id: amostraId },
      data: { status: 'em_processamento' },
    });
    // Espelha a posição inicial no rastreio das etiquetas do pedido.
    await this.sincronizarRastreio(amostraId, etapaInicial as EtapaOrdem, {
      responsavel: opts.responsavel,
    });
    if (opts.userId) {
      await this.audit.log(opts.userId, 'CREATE_AUTO', 'OrdemServico', os.id, { amostraId, etapaInicial });
    }
    return os;
  }

  /**
   * Cria OS automática (Macroscopia) para TODAS as amostras de um pedido que
   * ainda não têm OS. Best-effort POR AMOSTRA: a falha de uma não derruba as
   * demais — mas NUNCA é silenciosa: é logada, auditada e contabilizada em
   * `falhas`, para que o chamador possa avisar o operador.
   */
  async criarAutoParaPedido(
    pedidoId: number,
    opts: { prioridade?: string; responsavel?: string; userId?: number } = {},
  ): Promise<{ criadas: number; falhas: number }> {
    const amostras = await this.prisma.amostra.findMany({
      where: { pedidoId, ordemServico: null },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    let criadas = 0;
    let falhas = 0;
    for (const a of amostras) {
      try {
        await this.criarAuto(a.id, 'macroscopia', opts);
        criadas++;
      } catch (e: any) {
        falhas++;
        // Não silenciar: sem OS a amostra some da Fila. Registra para diagnóstico.
        console.error(
          `[OS auto] Falha ao criar OS da amostra #${a.id} (pedido #${pedidoId}):`,
          e?.message ?? e,
        );
        if (opts.userId) {
          await this.audit
            .log(opts.userId, 'CREATE_AUTO_FALHA', 'Amostra', a.id, {
              pedidoId,
              erro: String(e?.message ?? e),
            })
            .catch(() => {});
        }
      }
    }
    return { criadas, falhas };
  }

  // ── Amostras pendentes sem OS ────────────────────────────────────────────────
  async findPendentes() {
    return this.prisma.amostra.findMany({
      where: {
        status: 'pendente',
        ordemServico: null,
      },
      include: {
        pedido: {
          select: {
            numero: true,
            cliente: { select: { id: true, nome: true, nomeFantasia: true } },
          },
        },
      },
      orderBy: { dataRecebimento: 'asc' },
    });
  }

  // ── LIST ─────────────────────────────────────────────────────────────────────
  async findAll(filter: FilterOrdemDto) {
    const page  = Math.max(1, filter.page  ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (filter.status)    where.status     = filter.status;
    if (filter.etapa)     where.etapaAtual = filter.etapa;
    if (filter.prioridade) where.prioridade = filter.prioridade;

    if (filter.busca) {
      where.OR = [
        { numero: { contains: filter.busca, mode: 'insensitive' } },
        { amostra: { numeroInterno: { contains: filter.busca, mode: 'insensitive' } } },
        { amostra: { pedido: { cliente: { nome:         { contains: filter.busca, mode: 'insensitive' } } } } },
        { amostra: { pedido: { cliente: { nomeFantasia: { contains: filter.busca, mode: 'insensitive' } } } } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.ordemServico.count({ where }),
      this.prisma.ordemServico.findMany({
        where,
        include: INCLUDE_OS,
        orderBy: [
          { prioridade: 'desc' }, // urgente primeiro
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── GET ONE ──────────────────────────────────────────────────────────────────
  async findOne(id: number) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: INCLUDE_OS,
    });
    if (!os) throw new NotFoundException(`OS #${id} não encontrada.`);
    return os;
  }

  // ── CREATE ───────────────────────────────────────────────────────────────────
  async create(dto: CreateOrdemDto, userId: number) {
    const amostra = await this.prisma.amostra.findUnique({
      where: { id: dto.amostraId },
      include: { ordemServico: true },
    });
    if (!amostra) throw new NotFoundException(`Amostra #${dto.amostraId} não encontrada.`);
    if (amostra.ordemServico) {
      throw new ConflictException(
        `Amostra #${dto.amostraId} já possui uma OS (${amostra.ordemServico.numero}).`,
      );
    }

    const numero = await this.gerarNumero();

    const os = await this.prisma.ordemServico.create({
      data: {
        amostraId: dto.amostraId,
        numero,
        status: 'fila',
        etapaAtual: 'triagem',
        prioridade: dto.prioridade ?? 'normal',
        responsavel: dto.responsavel,
        responsavelUserId: dto.responsavelUserId ?? null,
        observacoes: dto.observacoes,
        etapas: {
          create: ETAPAS_ORDEM.map((etapa) => ({ etapa, status: 'pendente' })),
        },
      },
      include: INCLUDE_OS,
    });

    // Marca amostra como em processamento
    await this.prisma.amostra.update({
      where: { id: dto.amostraId },
      data: { status: 'em_processamento' },
    });

    await this.audit.log(userId, 'CREATE', 'OrdemServico', os.id, { amostraId: dto.amostraId });

    return os;
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  async update(id: number, dto: UpdateOrdemDto) {
    await this.findOne(id);
    return this.prisma.ordemServico.update({
      where: { id },
      data: { ...dto },
      include: INCLUDE_OS,
    });
  }

  // ── AVANÇAR ETAPA ────────────────────────────────────────────────────────────
  // ── Conferência fina (bipagem das lâminas antes da expedição) ─────────────────
  async statusConferencia(osId: number) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      select: { id: true, amostraId: true, conferenciaLiberada: true, conferenciaObs: true },
    });
    if (!os) throw new NotFoundException(`OS #${osId} não encontrada.`);
    const etiquetas = await this.prisma.etiqueta.findMany({
      where: { amostraId: os.amostraId },
      select: { id: true, codigo: true, numero: true, laminaSeq: true, coloracao: true, conferidaEm: true, conferidaPor: true },
      orderBy: { laminaSeq: 'asc' },
    });
    const conferidas = etiquetas.filter((e) => e.conferidaEm).length;
    return {
      esperado: etiquetas.length,
      conferidas,
      faltantes: etiquetas.length - conferidas,
      // Sem etiquetas (ex.: serviço sem geração de etiqueta) → nada a bipar,
      // conferência considerada completa; não trava a finalização.
      completo: conferidas === etiquetas.length,
      liberada: os.conferenciaLiberada,
      obs: os.conferenciaObs,
      etiquetas,
    };
  }

  /** Bipa uma etiqueta na conferência fina (deve pertencer à amostra da OS). */
  async conferir(osId: number, codigo: string, userId: number) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id: osId }, select: { amostraId: true } });
    if (!os) throw new NotFoundException(`OS #${osId} não encontrada.`);
    const alvo = (codigo ?? '').trim();
    // Aceita o código exato, um número puro, OU o primeiro grupo de dígitos de
    // um texto composto (ex.: "00000032 - 17062026") — mesmo comportamento do rastreio.
    const grupoDigitos = alvo.match(/\d+/);
    const asNumero = grupoDigitos ? parseInt(grupoDigitos[0], 10) : -1;
    const et = await this.prisma.etiqueta.findFirst({
      where: {
        amostraId: os.amostraId,
        OR: [{ codigo: alvo }, { numero: Number.isNaN(asNumero) ? -1 : asNumero }],
      },
      select: { id: true },
    });
    if (!et) throw new BadRequestException(`Etiqueta "${alvo}" não pertence a esta OS.`);
    const nome = await this.nomeUsuario(userId);
    await this.prisma.etiqueta.update({ where: { id: et.id }, data: { conferidaEm: new Date(), conferidaPor: nome } });
    return this.statusConferencia(osId);
  }

  /** Libera a conferência incompleta com justificativa (destrava a expedição). */
  async liberarConferencia(osId: number, obs: string, userId: number) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id: osId }, select: { id: true } });
    if (!os) throw new NotFoundException(`OS #${osId} não encontrada.`);
    if (!obs?.trim()) throw new BadRequestException('Informe a justificativa para liberar com pendência.');
    await this.prisma.ordemServico.update({
      where: { id: osId },
      data: { conferenciaLiberada: true, conferenciaObs: obs.trim() },
    });
    await this.audit.log(userId, 'LIBERA_CONFERENCIA', 'OrdemServico', osId, { obs });
    return this.statusConferencia(osId);
  }

  private async nomeUsuario(userId: number): Promise<string | undefined> {
    if (!userId) return undefined;
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { nome: true } });
    return u?.nome;
  }

  /** OS com conferência incompleta (relatório de pendências). */
  async pendencias() {
    const ativas = await this.prisma.ordemServico.findMany({
      where: { status: { in: ['fila', 'em_andamento'] } },
      select: {
        id: true, numero: true, etapaAtual: true, amostraId: true, conferenciaLiberada: true,
        amostra: {
          select: {
            numeroInterno: true,
            pedido: { select: { numero: true, cliente: { select: { nome: true, nomeFantasia: true } } } },
          },
        },
      },
      orderBy: { iniciadoEm: 'asc' },
    });
    const ids = ativas.map((o) => o.amostraId);
    const grupos = await this.prisma.etiqueta.groupBy({
      by: ['amostraId'],
      where: { amostraId: { in: ids } },
      _count: { _all: true },
    });
    const conf = await this.prisma.etiqueta.groupBy({
      by: ['amostraId'],
      where: { amostraId: { in: ids }, conferidaEm: { not: null } },
      _count: { _all: true },
    });
    const total = new Map(grupos.map((g) => [g.amostraId, g._count._all]));
    const feitas = new Map(conf.map((g) => [g.amostraId, g._count._all]));
    return ativas
      .map((o) => {
        const esperado = total.get(o.amostraId) ?? 0;
        const conferidas = feitas.get(o.amostraId) ?? 0;
        return {
          osId: o.id, numero: o.numero, etapaAtual: o.etapaAtual,
          cliente: o.amostra.pedido.cliente.nomeFantasia ?? o.amostra.pedido.cliente.nome,
          pedido: o.amostra.pedido.numero, amostra: o.amostra.numeroInterno,
          esperado, conferidas, faltantes: esperado - conferidas, liberada: o.conferenciaLiberada,
        };
      })
      .filter((o) => o.esperado > 0 && o.faltantes > 0 && !o.liberada);
  }

  async avancar(id: number, userId: number) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: { etapas: true },
    });
    if (!os) throw new NotFoundException(`OS #${id} não encontrada.`);
    if (os.status === 'concluida') throw new BadRequestException('OS já concluída.');
    if (os.status === 'cancelada') throw new BadRequestException('OS cancelada não pode ser avançada.');

    const agora = new Date();
    const etapaAtual = os.etapaAtual as Etapa;
    const proxima = proximaEtapa(etapaAtual);

    // Trava: sair da Finalização exige conferência fina completa (ou liberada c/ justificativa)
    if (etapaAtual === 'finalizacao') {
      const conf = await this.statusConferencia(id);
      if (!conf.completo && !conf.liberada) {
        throw new BadRequestException(
          `Conferência fina incompleta (${conf.conferidas}/${conf.esperado}). Bipe todas as lâminas ou libere com justificativa.`,
        );
      }
    }

    // Conclui etapa atual
    const etapaRecord = os.etapas.find((e) => e.etapa === etapaAtual);
    if (etapaRecord) {
      await this.prisma.etapaOS.update({
        where: { id: etapaRecord.id },
        data: {
          status: 'concluida',
          concluidoEm: agora,
          ...(etapaRecord.iniciadoEm ? {} : { iniciadoEm: agora }),
        },
      });
    }

    if (!proxima) {
      // Última etapa (laudo) concluída → OS concluída
      const updated = await this.prisma.ordemServico.update({
        where: { id },
        data: { status: 'concluida', concluidoEm: agora },
        include: INCLUDE_OS,
      });
      await this.prisma.amostra.update({
        where: { id: os.amostraId },
        data: { status: 'concluida' },
      });
      // Conclui o rastreio das etiquetas (saída do departamento final).
      await this.sincronizarRastreio(os.amostraId, etapaAtual, {
        responsavel: os.responsavel ?? undefined,
        concluir: true,
      });
      await this.audit.log(userId, 'AVANCO_ETAPA', 'OrdemServico', id, { de: etapaAtual, para: proxima });
      return updated;
    }

    // Avança para próxima etapa
    const dataFields: any = { etapaAtual: proxima };
    if (os.status === 'fila') {
      dataFields.status = 'em_andamento';
      dataFields.iniciadoEm = agora;
    }

    // Inicia próxima etapa
    const proximaRecord = os.etapas.find((e) => e.etapa === proxima);
    if (proximaRecord) {
      await this.prisma.etapaOS.update({
        where: { id: proximaRecord.id },
        data: { status: 'em_andamento', iniciadoEm: agora },
      });
    }

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: dataFields,
      include: INCLUDE_OS,
    });

    // Espelha o novo departamento no rastreio das etiquetas do pedido.
    await this.sincronizarRastreio(os.amostraId, proxima, {
      responsavel: os.responsavel ?? undefined,
    });

    await this.audit.log(userId, 'AVANCO_ETAPA', 'OrdemServico', id, { de: etapaAtual, para: proxima });

    return updated;
  }

  /**
   * Move a OS para um departamento qualquer (ação "Mover para" da Fila), fora do
   * avanço linear — para desvios como Imunofluorescência ou destinos de fim de
   * linha (Arquivamento/Descarte). Mover para um departamento terminal CONCLUI a
   * OS. É uma ação manual e deliberada: não aplica a trava da conferência fina.
   */
  async moverPara(id: number, destino: string, userId: number) {
    if (!ETAPAS_MOVIVEIS.includes(destino)) {
      throw new BadRequestException(`Departamento inválido: "${destino}".`);
    }
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: { etapas: true },
    });
    if (!os) throw new NotFoundException(`OS #${id} não encontrada.`);
    if (os.status === 'cancelada') {
      throw new BadRequestException('OS cancelada não pode ser movida.');
    }
    if (os.etapaAtual === destino) {
      throw new BadRequestException(`A OS já está em ${ETAPA_LABEL[destino] ?? destino}.`);
    }

    const agora = new Date();
    const etapaOrigem = os.etapaAtual;
    const terminal = ETAPAS_TERMINAIS.includes(destino);

    const dataFields: any = { etapaAtual: destino };
    if (terminal) {
      // Arquivamento / Descarte: fim de linha → conclui a OS.
      dataFields.status = 'concluida';
      dataFields.concluidoEm = agora;
    } else {
      // Reabre/mantém em andamento (permite tirar um item de um terminal também).
      dataFields.status = 'em_andamento';
      dataFields.concluidoEm = null;
      if (!os.iniciadoEm) dataFields.iniciadoEm = agora;
    }

    // Se o destino for uma etapa da linha principal (tem EtapaOS), marca-a
    // como em andamento; departamentos extras não têm EtapaOS.
    const destinoRecord = os.etapas.find((e) => e.etapa === destino);
    if (destinoRecord && !terminal) {
      await this.prisma.etapaOS.update({
        where: { id: destinoRecord.id },
        data: { status: 'em_andamento', iniciadoEm: destinoRecord.iniciadoEm ?? agora },
      });
    }

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: dataFields,
      include: INCLUDE_OS,
    });

    await this.prisma.amostra.update({
      where: { id: os.amostraId },
      data: { status: terminal ? 'concluida' : 'em_processamento' },
    });

    // Espelha o destino no rastreio das etiquetas do pedido.
    await this.sincronizarRastreio(os.amostraId, destino as EtapaOrdem, {
      responsavel: os.responsavel ?? undefined,
      concluir: terminal,
    });

    await this.audit.log(userId, 'MOVER_ETAPA', 'OrdemServico', id, {
      de: etapaOrigem,
      para: destino,
      concluiu: terminal,
    });

    return updated;
  }

  // ── CANCELAR ─────────────────────────────────────────────────────────────────
  async cancelar(id: number, userId: number) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException(`OS #${id} não encontrada.`);
    if (os.status === 'concluida') throw new BadRequestException('OS concluída não pode ser cancelada.');
    if (os.status === 'cancelada') throw new BadRequestException('OS já cancelada.');

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'cancelada' },
      include: INCLUDE_OS,
    });

    await this.prisma.amostra.update({
      where: { id: os.amostraId },
      data: { status: 'pendente' },
    });

    await this.audit.log(userId, 'CANCEL', 'OrdemServico', id, { amostraId: os.amostraId });

    return updated;
  }
}
