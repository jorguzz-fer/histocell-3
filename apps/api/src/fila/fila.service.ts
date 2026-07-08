import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ETAPAS_FILA } from '../ordens/etapas';

const ETAPAS = ETAPAS_FILA;

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
        cliente: { select: { id: true, nome: true, nomeFantasia: true } },
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
              cliente: { select: { id: true, nome: true, nomeFantasia: true } },
            },
          },
        },
      },
    } as const;

    const baseWhere: any = { status: 'em_andamento' };
    // "Só meus": mostra as OS atribuídas a mim E as ainda SEM dono (não
    // atribuídas) — senão a fila fica vazia, pois a OS automática do
    // recebimento nasce sem responsável.
    if (userId) baseWhere.OR = [{ responsavelUserId: userId }, { responsavelUserId: null }];

    const porEtapa = await Promise.all(
      ETAPAS.map((etapa) =>
        this.prisma.ordemServico.findMany({
          where: { ...baseWhere, etapaAtual: etapa },
          select: osSelect,
          orderBy: [{ prioridade: 'desc' }, { iniciadoEm: 'asc' }],
          take: 50,
        }),
      ),
    );

    const secoes: Record<string, any> = { aprovacaoDivergencia };
    const counts: Record<string, number> = { aprovacaoDivergencia: aprovacaoDivergencia.length };
    ETAPAS.forEach((etapa, i) => {
      secoes[etapa] = porEtapa[i];
      counts[etapa] = porEtapa[i].length;
    });

    return { etapas: ETAPAS, counts, secoes };
  }
}
