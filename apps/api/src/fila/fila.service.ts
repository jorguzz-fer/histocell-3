import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const ETAPAS = ['macroscopia', 'processamento', 'laudo'] as const;

@Injectable()
export class FilaService {
  constructor(private prisma: PrismaService) {}

  async getFila(userId?: number) {
    // Seção 1: pedidos aguardando aprovação de divergência
    const pedidosPendentes = await this.prisma.pedido.findMany({
      where: { status: 'recebido_pendente_aprovacao' },
      select: {
        id: true,
        numero: true,
        dataRecebimento: true,
        contagemDivergente: true,
        cliente: { select: { nome: true, nomeFantasia: true } },
        itens: { select: { quantidade: true } },
        amostras: { select: { id: true } },
      },
      orderBy: { dataRecebimento: 'asc' },
      take: 50,
    });

    const aprovacaoDivergencia = pedidosPendentes.map((p) => ({
      id: p.id,
      numero: p.numero,
      clienteNome: p.cliente?.nomeFantasia || p.cliente?.nome || '',
      totalOrcado: p.itens.reduce((s, i) => s + i.quantidade, 0),
      totalRecebido: p.amostras.length,
      dataRecebimento: p.dataRecebimento,
    }));

    // Seções 2-4: OS por etapa
    const osSelect = {
      id: true,
      numero: true,
      etapaAtual: true,
      prioridade: true,
      responsavel: true,
      responsavelUserId: true,
      iniciadoEm: true,
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
              cliente: { select: { nome: true, nomeFantasia: true } },
            },
          },
        },
      },
    } as const;

    const baseWhere: any = { status: 'em_andamento' };
    if (userId) baseWhere.responsavelUserId = userId;

    const [macroscopia, processamento, laudo] = await Promise.all(
      ETAPAS.map((etapa) =>
        this.prisma.ordemServico.findMany({
          where: { ...baseWhere, etapaAtual: etapa },
          select: osSelect,
          orderBy: [{ prioridade: 'desc' }, { iniciadoEm: 'asc' }],
          take: 50,
        }),
      ),
    );

    return {
      counts: {
        aprovacaoDivergencia: aprovacaoDivergencia.length,
        macroscopia: macroscopia.length,
        processamento: processamento.length,
        laudo: laudo.length,
      },
      secoes: {
        aprovacaoDivergencia,
        macroscopia,
        processamento,
        laudo,
      },
    };
  }
}
