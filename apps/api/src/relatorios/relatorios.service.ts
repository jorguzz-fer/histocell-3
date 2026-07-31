import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const DEP_PROCESSAMENTO = 'processamento';
const DEP_EXPEDICAO = 'expedicao';

function diffMin(a?: Date | null, b?: Date | null): number | null {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

@Injectable()
export class RelatoriosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Relatório de tempos do processo, por pedido:
   * Criado → Recepção → Laboratório → Processado → Despachado.
   *  - criado/recepção/laboratório vêm dos carimbos do Pedido;
   *  - processado/despachado vêm dos scans de rastreio das etiquetas do pedido.
   */
  async tempos(inicio?: string, fim?: string) {
    const where: any = { dataRecepcao: { not: null } }; // só quem entrou no fluxo
    if (inicio || fim) {
      where.createdAt = {};
      if (inicio) where.createdAt.gte = new Date(inicio);
      if (fim) {
        const f = new Date(fim);
        f.setHours(23, 59, 59, 999);
        where.createdAt.lte = f;
      }
    }

    const pedidos = await this.prisma.pedido.findMany({
      where,
      select: {
        numero: true,
        urgente: true,
        createdAt: true,
        dataRecepcao: true,
        dataRecebimento: true,
        cliente: { select: { id: true, nome: true, nomeFantasia: true, idEtiqueta: true } },
        amostras: {
          select: {
            etiquetas: {
              select: {
                eventos: { select: { departamento: true, tipo: true, createdAt: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const rows = pedidos.map((p) => {
      let processado: Date | null = null; // 1ª entrada em "processamento"
      let despachado: Date | null = null; // última passagem por "expedição"
      for (const a of p.amostras) {
        for (const e of a.etiquetas) {
          for (const ev of e.eventos) {
            if (ev.departamento === DEP_PROCESSAMENTO && ev.tipo === 'entrada') {
              if (!processado || ev.createdAt < processado) processado = ev.createdAt;
            }
            if (ev.departamento === DEP_EXPEDICAO) {
              if (!despachado || ev.createdAt > despachado) despachado = ev.createdAt;
            }
          }
        }
      }
      return {
        numero: p.numero,
        cliente: p.cliente.nomeFantasia ?? p.cliente.nome,
        clienteCodigo: p.cliente.idEtiqueta ?? String(p.cliente.id),
        urgente: p.urgente,
        criado: p.createdAt,
        recepcao: p.dataRecepcao,
        laboratorio: p.dataRecebimento,
        processado,
        despachado,
        durRecepcao: diffMin(p.createdAt, p.dataRecepcao),
        durLaboratorio: diffMin(p.dataRecepcao, p.dataRecebimento),
        durProcessamento: diffMin(p.dataRecebimento, processado),
        durDespacho: diffMin(processado, despachado),
        durTotal: diffMin(p.createdAt, despachado),
      };
    });

    const media = (key: keyof (typeof rows)[number]) => {
      const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === 'number');
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    return {
      rows,
      resumo: {
        totalPedidos: rows.length,
        mediaRecepcao: media('durRecepcao'),
        mediaLaboratorio: media('durLaboratorio'),
        mediaProcessamento: media('durProcessamento'),
        mediaDespacho: media('durDespacho'),
        mediaTotal: media('durTotal'),
      },
    };
  }
}
