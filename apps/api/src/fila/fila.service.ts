import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ETAPAS_FILA, ETAPAS_TERMINAIS } from '../ordens/etapas';

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
        seq: true,
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
      codigoCurto: p.seq != null ? `#${String(p.seq).padStart(4, '0')}` : p.numero,
      clienteNome: p.cliente?.nomeFantasia || p.cliente?.nome || '',
      totalOrcado: p.itens.reduce((s, i) => s + i.quantidade, 0),
      totalRecebido: p.amostras.length,
      dataRecebimento: p.dataRecebimento,
    }));

    // Seções 2-4: OS por etapa
    const osSelect = {
      id: true,
      numero: true,
      seq: true,
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
              id: true,
              numero: true,
              seq: true,
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
      ETAPAS.map((etapa) => {
        // Colunas terminais (Arquivamento/Descarte) mostram os itens já
        // CONCLUÍDOS naquele destino — mover para lá conclui a OS, então ela
        // sai do filtro "em_andamento". As demais colunas mostram o fluxo ativo.
        const terminal = ETAPAS_TERMINAIS.includes(etapa);
        const where = terminal
          ? { status: 'concluida', etapaAtual: etapa }
          : { ...baseWhere, etapaAtual: etapa };
        return this.prisma.ordemServico.findMany({
          where,
          select: osSelect,
          orderBy: terminal
            ? [{ concluidoEm: 'desc' as const }]
            : [{ prioridade: 'desc' as const }, { iniciadoEm: 'asc' as const }],
          take: 50,
        });
      }),
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
