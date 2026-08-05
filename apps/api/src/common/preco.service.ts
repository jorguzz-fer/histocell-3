import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type PrecoResolvido = {
  preco: number;
  desconto: number;
  origem: 'tabela' | 'pesquisa' | 'rotina';
};

/**
 * Regra de preço unitário cliente × serviço. Mora aqui, e não dentro de
 * Pedidos, porque a Ordem de Serviço também precisa dela — e Pedidos já importa
 * Ordens, então injetar PedidosService em OrdensService fecharia um ciclo entre
 * os módulos. Uma regra, um lugar.
 */
@Injectable()
export class PrecoService {
  constructor(private prisma: PrismaService) {}

  /** TabelaPreco do cliente → preço pelo segmento → preço base. */
  async getPreco(clienteId: number, servicoId: number): Promise<PrecoResolvido> {
    // 1. Preço customizado por cliente
    const tabela = await this.prisma.tabelaPreco.findUnique({
      where: { clienteId_servicoId: { clienteId, servicoId } },
    });
    if (tabela) {
      return { preco: Number(tabela.preco), desconto: Number(tabela.desconto), origem: 'tabela' };
    }

    // 2. Segmento do cliente determina rotina vs pesquisa
    const [cliente, servico] = await Promise.all([
      this.prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { segmento: true, descontoPadrao: true },
      }),
      this.prisma.servico.findUnique({
        where: { id: servicoId },
        select: { precoRotina: true, precoPesquisa: true, precoBase: true },
      }),
    ]);
    if (!servico) throw new NotFoundException(`Serviço #${servicoId} não encontrado.`);

    const isPesquisador = cliente?.segmento === 'pesquisador';
    const preco = isPesquisador
      ? Number(servico.precoPesquisa)
      : Number(servico.precoRotina || servico.precoBase);

    // Desconto fixo recorrente do cliente (%) aplicado por padrão
    const descontoPadrao = cliente?.descontoPadrao != null ? Number(cliente.descontoPadrao) : 0;

    return { preco, desconto: descontoPadrao, origem: isPesquisador ? 'pesquisa' : 'rotina' };
  }
}
