import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateOrdemDto } from './dto/create-ordem.dto';
import { UpdateOrdemDto } from './dto/update-ordem.dto';
import { FilterOrdemDto } from './dto/filter-ordem.dto';

// ─── constantes ───────────────────────────────────────────────────────────────

const ETAPAS_ORDEM = ['triagem', 'macroscopia', 'processamento', 'laudo'] as const;
type Etapa = typeof ETAPAS_ORDEM[number];

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function proximaEtapa(atual: Etapa): Etapa | null {
  const idx = ETAPAS_ORDEM.indexOf(atual);
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
  constructor(private prisma: PrismaService) {}

  // ── número sequencial diário ─────────────────────────────────────────────────
  private async gerarNumero(): Promise<string> {
    const hoje = toDateStr(new Date());
    const prefix = `OS-${hoje}-`;
    const count = await this.prisma.ordemServico.count({
      where: { numero: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
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
  async create(dto: CreateOrdemDto) {
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
  async avancar(id: number) {
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

    return this.prisma.ordemServico.update({
      where: { id },
      data: dataFields,
      include: INCLUDE_OS,
    });
  }

  // ── CANCELAR ─────────────────────────────────────────────────────────────────
  async cancelar(id: number) {
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

    return updated;
  }
}
