import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ScanDto } from './dto/scan.dto';
import { FilterRastreioDto } from './dto/filter-rastreio.dto';
import { DEPARTAMENTOS, DEPARTAMENTOS_FINAIS } from './departamentos';

const INCLUDE_ETIQUETA = {
  amostra: {
    select: {
      id: true,
      numeroInterno: true,
      pedido: {
        select: {
          id: true,
          numero: true,
          qtdPrevista: true,
          qtdRecebida: true,
          cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        },
      },
    },
  },
  // Etiqueta de cassete gerada direto na OS (fluxo da Entrada): sem amostra,
  // o cliente e a referência vêm da própria OS.
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
export class RastreioService {
  constructor(private prisma: PrismaService) {}

  /** Lista de departamentos do fluxo (para seldtores no front). */
  departamentos() {
    return DEPARTAMENTOS;
  }

  // ── Resolve uma etiqueta a partir do que foi escaneado/digitado ───────────────
  // Aceita o código composto (conteúdo do barcode) OU o número impresso
  // (ex.: "00000032 - 17062026" → número 32).
  private async resolveEtiquetaId(input: string): Promise<{ id: number; codigo: string } | null> {
    const texto = input.trim();
    if (!texto) return null;

    const byCodigo = await this.prisma.etiqueta.findUnique({
      where: { codigo: texto },
      select: { id: true, codigo: true },
    });
    if (byCodigo) return byCodigo;

    // tenta pelo primeiro grupo de dígitos (= número da etiqueta)
    const m = texto.match(/\d+/);
    if (m) {
      const numero = parseInt(m[0], 10);
      if (Number.isFinite(numero) && numero > 0) {
        const byNumero = await this.prisma.etiqueta.findUnique({
          where: { numero },
          select: { id: true, codigo: true },
        });
        if (byNumero) return byNumero;
      }
    }
    return null;
  }

  // ── Scan: registra entrada/saída de uma etiqueta num departamento ─────────────
  async scan(dto: ScanDto) {
    const found = await this.resolveEtiquetaId(dto.codigo);
    if (!found) {
      throw new NotFoundException(`Nenhuma etiqueta encontrada para o código "${dto.codigo.trim()}".`);
    }

    const isFinal = DEPARTAMENTOS_FINAIS.includes(dto.departamento as any);
    const rastreioStatus =
      dto.tipo === 'entrada' ? 'em_andamento' : isFinal ? 'concluido' : 'aguardando';

    const [evento, atualizada] = await this.prisma.$transaction([
      this.prisma.rastreioEvento.create({
        data: {
          etiquetaId: found.id,
          departamento: dto.departamento,
          tipo: dto.tipo,
          scannedPor: dto.scannedPor,
          observacoes: dto.observacoes,
        },
      }),
      this.prisma.etiqueta.update({
        where: { id: found.id },
        data: {
          departamentoAtual: dto.departamento,
          rastreioStatus,
          ultimoEventoEm: new Date(),
          ...(dto.scannedPor ? { ultimoResponsavel: dto.scannedPor } : {}),
        },
        include: INCLUDE_ETIQUETA,
      }),
    ]);

    const labelDep = DEPARTAMENTOS.find((d) => d.key === dto.departamento)?.label ?? dto.departamento;
    const acao = dto.tipo === 'entrada' ? 'entrou em' : 'saiu de';
    return {
      message: `Etiqueta ${atualizada.codigo} ${acao} ${labelDep}.`,
      evento,
      etiqueta: atualizada,
    };
  }

  // ── Timeline de uma etiqueta (por código ou número) ───────────────────────────
  async timeline(codigo: string) {
    const found = await this.resolveEtiquetaId(codigo);
    if (!found) {
      throw new NotFoundException(`Nenhuma etiqueta encontrada para o código "${(codigo ?? '').trim()}".`);
    }
    const etiqueta = await this.prisma.etiqueta.findUnique({
      where: { id: found.id },
      include: {
        ...INCLUDE_ETIQUETA,
        eventos: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!etiqueta) {
      throw new NotFoundException(`Nenhuma etiqueta encontrada para o código "${(codigo ?? '').trim()}".`);
    }

    // monta segmentos (entrada → saída) por departamento, com duração
    type Segmento = {
      departamento: string;
      entrada: Date | null;
      saida: Date | null;
      duracaoMin: number | null;
    };
    const abertos: Record<string, Segmento> = {};
    const segmentos: Segmento[] = [];
    for (const ev of etiqueta.eventos) {
      if (ev.tipo === 'entrada') {
        const seg: Segmento = {
          departamento: ev.departamento,
          entrada: ev.createdAt,
          saida: null,
          duracaoMin: null,
        };
        abertos[ev.departamento] = seg;
        segmentos.push(seg);
      } else {
        const seg = abertos[ev.departamento];
        if (seg) {
          seg.saida = ev.createdAt;
          seg.duracaoMin = Math.round(
            (ev.createdAt.getTime() - (seg.entrada?.getTime() ?? ev.createdAt.getTime())) / 60000,
          );
          delete abertos[ev.departamento];
        } else {
          // saída sem entrada registrada — segmento solto
          segmentos.push({
            departamento: ev.departamento,
            entrada: null,
            saida: ev.createdAt,
            duracaoMin: null,
          });
        }
      }
    }

    return { etiqueta, segmentos };
  }

  // ── Lista paginada de etiquetas com filtros de rastreio ───────────────────────
  async findAll(filter: FilterRastreioDto) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.departamento) where.departamentoAtual = filter.departamento;
    if (filter.status) where.rastreioStatus = filter.status;
    if (filter.busca) {
      where.OR = [
        { codigo: { contains: filter.busca, mode: 'insensitive' } },
        { identificacao: { contains: filter.busca, mode: 'insensitive' } },
        { amostra: { numeroInterno: { contains: filter.busca, mode: 'insensitive' } } },
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
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.etiqueta.count({ where }),
      this.prisma.etiqueta.findMany({
        where,
        include: INCLUDE_ETIQUETA,
        orderBy: { ultimoEventoEm: { sort: 'desc', nulls: 'last' } },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Resumo: quantas etiquetas estão em cada departamento ──────────────────────
  async resumo() {
    const grupos = await this.prisma.etiqueta.groupBy({
      by: ['departamentoAtual'],
      where: { rastreioStatus: { in: ['em_andamento', 'aguardando'] } },
      _count: { _all: true },
    });
    const mapa = new Map(grupos.map((g) => [g.departamentoAtual, g._count._all]));

    const departamentos = DEPARTAMENTOS.map((d) => ({
      key: d.key,
      label: d.label,
      ordem: d.ordem,
      emProcesso: mapa.get(d.key) ?? 0,
    }));

    const [concluidas, naoIniciadas, total] = await this.prisma.$transaction([
      this.prisma.etiqueta.count({ where: { rastreioStatus: 'concluido' } }),
      this.prisma.etiqueta.count({ where: { rastreioStatus: 'nao_iniciado' } }),
      this.prisma.etiqueta.count(),
    ]);

    return { departamentos, concluidas, naoIniciadas, total };
  }
}
