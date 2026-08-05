import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type LinhaConsumo = {
  /** Nome do serviço, como sai na fatura/NF. */
  servico: string;
  codigo: string;
  quantidade: number;
  /** Preço unitário já com o desconto do item aplicado. */
  valorUnit: number;
  valorTotal: number;
};

export type ConsumoCliente = {
  clienteId: number;
  nome: string;
  nomeFantasia: string | null;
  /** OS do período que já têm serviço definido. */
  ordens: string[];
  /** OS do período ainda SEM serviço definido — não entram no valor. */
  ordensSemServico: string[];
  linhas: LinhaConsumo[];
  totalBruto: number;
  /** Parte já paga na entrada (pedido marcado como adiantado). */
  adiantado: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Consumo faturável do mês, a partir da **Ordem de Serviço**.
 *
 * A OS é onde a equipe confirma o que foi efetivamente executado sobre o
 * material; o orçamento (ItemPedido) é a estimativa anterior e não vale mais
 * para cobrança. Uma fonte só, usada pelo fechamento, pela discriminação por
 * serviço e pela emissão da fatura — as três precisam concordar, senão o
 * cliente recebe um boleto que não bate com o relatório.
 *
 * Recorte do período: OS **aberta** no mês. É o mesmo momento que a regra
 * anterior usava (`Pedido.dataRecebimento`), já que a OS nasce quando o
 * material chega — trocar o valor sem trocar também a data de corte mantém o
 * ciclo de cobrança que o cliente já conhece.
 */
@Injectable()
export class ConsumoService {
  constructor(private prisma: PrismaService) {}

  async doMes(ano: number, mes: number, clienteId?: number): Promise<ConsumoCliente[]> {
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1); // exclusivo

    const ordens = await this.prisma.ordemServico.findMany({
      where: {
        status: { not: 'cancelada' },
        createdAt: { gte: inicio, lt: fim },
        ...(clienteId ? { OR: [{ clienteId }, { amostra: { pedido: { clienteId } } }] } : {}),
      },
      select: {
        numero: true,
        clienteId: true,
        cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        amostra: {
          select: {
            pedido: {
              select: {
                pagamentoAdiantado: true,
                cliente: { select: { id: true, nome: true, nomeFantasia: true } },
              },
            },
          },
        },
        // Adiantamento é atributo do pedido; a OS herda dos volumes vinculados.
        volumes: { select: { pedido: { select: { pagamentoAdiantado: true } } } },
        itens: {
          select: {
            quantidade: true,
            preco: true,
            desconto: true,
            servico: { select: { nome: true, codigo: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const porCliente = new Map<number, ConsumoCliente & { mapa: Map<string, LinhaConsumo> }>();

    for (const os of ordens) {
      const cli = os.cliente ?? os.amostra?.pedido.cliente;
      if (!cli) continue; // schema garante um dono, mas não presumimos

      const cur =
        porCliente.get(cli.id) ??
        {
          clienteId: cli.id,
          nome: cli.nome,
          nomeFantasia: cli.nomeFantasia,
          ordens: [],
          ordensSemServico: [],
          linhas: [],
          totalBruto: 0,
          adiantado: 0,
          mapa: new Map<string, LinhaConsumo>(),
        };

      if (os.itens.length === 0) {
        // OS aberta e ainda sem serviço confirmado: some da conta, mas é
        // reportada para alguém decidir antes de faturar.
        cur.ordensSemServico.push(os.numero);
        porCliente.set(cli.id, cur);
        continue;
      }

      const adiantada =
        os.amostra?.pedido.pagamentoAdiantado === true ||
        os.volumes.some((v) => v.pedido?.pagamentoAdiantado === true);

      let valorOS = 0;
      for (const it of os.itens) {
        const unit = round(Number(it.preco) * (1 - Number(it.desconto) / 100));
        const chave = `${it.servico.codigo}::${unit}`;
        const linha =
          cur.mapa.get(chave) ??
          {
            servico: it.servico.nome,
            codigo: it.servico.codigo,
            quantidade: 0,
            valorUnit: unit,
            valorTotal: 0,
          };
        linha.quantidade += it.quantidade;
        linha.valorTotal = round(linha.valorTotal + unit * it.quantidade);
        cur.mapa.set(chave, linha);
        valorOS += unit * it.quantidade;
      }

      cur.ordens.push(os.numero);
      cur.totalBruto = round(cur.totalBruto + valorOS);
      if (adiantada) cur.adiantado = round(cur.adiantado + valorOS);
      porCliente.set(cli.id, cur);
    }

    return Array.from(porCliente.values())
      .map(({ mapa, ...c }) => ({
        ...c,
        linhas: Array.from(mapa.values()).sort((a, b) => a.servico.localeCompare(b.servico, 'pt')),
      }))
      .sort((a, b) => (a.nomeFantasia ?? a.nome).localeCompare(b.nomeFantasia ?? b.nome, 'pt'));
  }

  /** Consumo de um cliente só (vazio quando não houve movimento no mês). */
  async doClienteNoMes(clienteId: number, ano: number, mes: number): Promise<ConsumoCliente | null> {
    const [c] = await this.doMes(ano, mes, clienteId);
    return c ?? null;
  }
}
