import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PedidosService } from '../pedidos/pedidos.service';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { PortalPedidoDto } from './dto/portal-pedido.dto';

type ClientePortal = {
  id: number;
  nome: string;
  nomeFantasia: string | null;
  segmento: string;
  descontoPadrao: any;
  ativo: boolean;
};

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private pedidos: PedidosService,
    private financeiro: FinanceiroService,
  ) {}

  // resolve o cliente pelo token do portal (precisa estar ativo)
  private async resolverCliente(token: string): Promise<ClientePortal> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { portalToken: (token ?? '').trim() },
      select: {
        id: true, nome: true, nomeFantasia: true, segmento: true,
        descontoPadrao: true, ativo: true,
      },
    });
    if (!cliente || !cliente.ativo) {
      throw new NotFoundException('Link inválido ou inativo.');
    }
    return cliente as ClientePortal;
  }

  // preço efetivo de um serviço para o cliente (mesma regra do getPreco)
  private efetivo(
    s: { id: number; precoRotina: any; precoPesquisa: any; precoBase: any },
    isPesquisador: boolean,
    descontoPadrao: number,
    tabela: Map<number, { preco: number; desconto: number }>,
  ) {
    const t = tabela.get(s.id);
    if (t) return { preco: t.preco, desconto: t.desconto };
    const preco = isPesquisador
      ? Number(s.precoPesquisa)
      : Number(s.precoRotina || s.precoBase);
    return { preco, desconto: descontoPadrao };
  }

  // ── Dados do portal: cliente + saldo ──────────────────────────────────────
  async info(token: string) {
    const cliente = await this.resolverCliente(token);
    const { saldo } = await this.financeiro.saldoCliente(cliente.id);
    return {
      cliente: { id: cliente.id, nome: cliente.nome, nomeFantasia: cliente.nomeFantasia },
      isPesquisador: cliente.segmento === 'pesquisador',
      saldo,
    };
  }

  // ── Catálogo com preços do cliente ──────────────────────────────────────────
  async catalogo(token: string) {
    const cliente = await this.resolverCliente(token);
    const isPesquisador = cliente.segmento === 'pesquisador';
    const descontoPadrao = Number(cliente.descontoPadrao ?? 0);

    const tabelaRows = await this.prisma.tabelaPreco.findMany({
      where: { clienteId: cliente.id },
      select: { servicoId: true, preco: true, desconto: true },
    });
    const tabela = new Map(
      tabelaRows.map((t) => [t.servicoId, { preco: Number(t.preco), desconto: Number(t.desconto) }]),
    );

    const servicosRaw = await this.prisma.servico.findMany({
      where: { ativo: true },
      select: {
        id: true, codigo: true, nome: true, categoria: true,
        precoRotina: true, precoPesquisa: true, precoBase: true,
      },
      orderBy: { nome: 'asc' },
    });
    const precoMap = new Map<number, { preco: number; desconto: number }>();
    const servicos = servicosRaw.map((s) => {
      const p = this.efetivo(s, isPesquisador, descontoPadrao, tabela);
      precoMap.set(s.id, p);
      return { id: s.id, codigo: s.codigo, nome: s.nome, categoria: s.categoria, ...p };
    });

    // pacotes ativos (itens precificados pela tabela do cliente, p/ consistência)
    const pacotesRaw = await this.prisma.pacote.findMany({
      where: { ativo: true },
      include: {
        itens: {
          include: {
            servico: {
              select: {
                id: true, codigo: true, nome: true, categoria: true,
                precoRotina: true, precoPesquisa: true, precoBase: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    });
    const pacotes = pacotesRaw.map((p) => {
      const itens = p.itens.map((it) => {
        const pr = this.efetivo(it.servico, isPesquisador, descontoPadrao, tabela);
        return {
          servicoId: it.servicoId,
          quantidade: it.quantidade,
          nome: it.servico.nome,
          categoria: it.servico.categoria,
          preco: pr.preco,
          desconto: pr.desconto,
        };
      });
      const precoTotal =
        Math.round(
          itens.reduce((s, it) => s + it.preco * it.quantidade * (1 - it.desconto / 100), 0) * 100,
        ) / 100;
      const categorias = Array.from(new Set(itens.map((i) => i.categoria).filter(Boolean))).sort();
      return { id: p.id, codigo: p.codigo, nome: p.nome, itens, precoTotal, totalItens: itens.length, categorias };
    });

    // populares (top serviços) e histórico do cliente — reprecificados
    const reprice = (s: any) => {
      const p = precoMap.get(s.id) ?? this.efetivo(s, isPesquisador, descontoPadrao, tabela);
      return { id: s.id, codigo: s.codigo, nome: s.nome, categoria: s.categoria, ...p };
    };
    const [popularesRaw, historicoRaw] = await Promise.all([
      this.pedidos.getPopulares(),
      this.pedidos.getHistoricoCliente(cliente.id),
    ]);
    const populares = (popularesRaw as any[])
      .filter((s) => s && precoMap.has(s.id))
      .map((s) => ({ ...reprice(s), totalUsos: s.totalUsos }));
    const historico = (historicoRaw as any[])
      .filter((s) => s && precoMap.has(s.id))
      .map((s) => ({ ...reprice(s), ultimoPedidoEm: s.ultimoPedidoEm }));

    return { servicos, pacotes, populares, historico };
  }

  // ── Últimos pedidos do cliente ──────────────────────────────────────────────
  async listarPedidos(token: string) {
    const cliente = await this.resolverCliente(token);
    const pedidos = await this.prisma.pedido.findMany({
      where: { clienteId: cliente.id },
      select: {
        numero: true,
        status: true,
        origem: true,
        createdAt: true,
        itens: { select: { preco: true, quantidade: true, desconto: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return pedidos.map((p) => ({
      numero: p.numero,
      status: p.status,
      origem: p.origem,
      createdAt: p.createdAt,
      totalItens: p.itens.length,
      valorTotal:
        Math.round(
          p.itens.reduce(
            (s, i) => s + Number(i.preco) * i.quantidade * (1 - Number(i.desconto) / 100),
            0,
          ) * 100,
        ) / 100,
    }));
  }

  // ── Criar pedido (origem=web; preços recalculados no servidor) ─────────────
  async criarPedido(token: string, dto: PortalPedidoDto) {
    const cliente = await this.resolverCliente(token);

    const itens: { servicoId: number; quantidade: number; preco: number; desconto: number }[] = [];
    for (const it of dto.itens) {
      const { preco, desconto } = await this.pedidos.getPreco(cliente.id, it.servicoId);
      itens.push({ servicoId: it.servicoId, quantidade: it.quantidade, preco, desconto });
    }

    const pedido = await this.pedidos.create({
      clienteId: cliente.id,
      status: 'enviado',
      origem: 'web',
      observacoes: dto.observacoes,
      itens,
    } as any);

    return { numero: pedido.numero, valorTotal: pedido.valorTotal, totalItens: pedido.totalItens };
  }
}
