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

  // ── Extrato de crédito do cliente (saldo + movimentos) ─────────────────────
  async extrato(token: string) {
    const cliente = await this.resolverCliente(token);
    const dados = await this.financeiro.extrato(cliente.id);
    // Não expomos o objeto "cliente" do extrato (já vem em /portal/:token info)
    return {
      saldo: dados.saldoAtual,
      movimentos: dados.movimentos,
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
      const modoDesc = p.tipoPreco === 'desconto';
      const itens = p.itens.map((it) => {
        const pr = this.efetivo(it.servico, isPesquisador, descontoPadrao, tabela);
        // 'fixo' → preço fechado do componente; 'desconto' → tabela do cliente menos o % do pacote
        const preco = modoDesc ? pr.preco : Number(it.preco);
        const desconto = modoDesc ? Number(it.descontoPct) : 0;
        return {
          servicoId: it.servicoId,
          quantidade: it.quantidade,
          nome: it.servico.nome,
          categoria: it.servico.categoria,
          preco,
          desconto,
        };
      });
      const precoTotal =
        Math.round(
          itens.reduce((s, it) => s + it.preco * it.quantidade * (1 - it.desconto / 100), 0) * 100,
        ) / 100;
      const categorias = Array.from(new Set(itens.map((i) => i.categoria).filter(Boolean))).sort();
      return {
        id: p.id, codigo: p.codigo, nome: p.nome, tipoPreco: p.tipoPreco,
        precoEstimado: modoDesc, itens, precoTotal, totalItens: itens.length, categorias,
      };
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

  // ── Faturas/boletos do cliente (2ª via no portal) ───────────────────────────
  async listarFaturas(token: string) {
    const cliente = await this.resolverCliente(token);
    const faturas = await this.prisma.fatura.findMany({
      where: { clienteId: cliente.id, status: { in: ['emitida', 'paga'] } },
      select: {
        numero: true, periodo: true, status: true,
        valorTotal: true, dataVencimento: true, dataPagamento: true,
        linhaDigitavel: true, pixQrCode: true, pdfUrl: true,
      },
      orderBy: { dataVencimento: 'desc' },
      take: 24,
    });
    return faturas.map((f) => ({ ...f, valorTotal: Number(f.valorTotal) }));
  }

  // ── Laudos liberados do cliente (portal) ────────────────────────────────────
  async listarLaudos(token: string) {
    const cliente = await this.resolverCliente(token);
    const laudos = await this.prisma.laudo.findMany({
      where: { liberado: true, pedido: { clienteId: cliente.id } },
      select: {
        id: true,
        arquivoNome: true,
        liberadoEm: true,
        pedido: { select: { numero: true } },
      },
      orderBy: { liberadoEm: 'desc' },
    });
    return laudos.map((l) => ({
      id: l.id,
      arquivoNome: l.arquivoNome,
      liberadoEm: l.liberadoEm,
      pedidoNumero: l.pedido?.numero ?? null,
    }));
  }

  /** PDF de um laudo liberado do próprio cliente. */
  async laudoArquivo(token: string, id: number) {
    const cliente = await this.resolverCliente(token);
    const laudo = await this.prisma.laudo.findFirst({
      where: { id, liberado: true, pedido: { clienteId: cliente.id } },
      select: { arquivoBase64: true, arquivoNome: true },
    });
    if (!laudo || !laudo.arquivoBase64) throw new NotFoundException('Laudo não encontrado.');
    return laudo;
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

  private async precificar(clienteId: number, itensDto: { servicoId: number; quantidade: number }[]) {
    const itens: { servicoId: number; quantidade: number; preco: number; desconto: number }[] = [];
    for (const it of itensDto) {
      const { preco, desconto } = await this.pedidos.getPreco(clienteId, it.servicoId);
      itens.push({ servicoId: it.servicoId, quantidade: it.quantidade, preco, desconto });
    }
    return itens;
  }

  // ── Criar pedido (origem=web; preços recalculados no servidor) ─────────────
  async criarPedido(token: string, dto: PortalPedidoDto) {
    const cliente = await this.resolverCliente(token);
    const itens = await this.precificar(cliente.id, dto.itens);

    const pedido = await this.pedidos.create({
      clienteId: cliente.id,
      status: dto.status ?? 'enviado',
      origem: 'web',
      observacoes: dto.observacoes,
      itens,
    } as any);

    return { numero: pedido.numero, valorTotal: pedido.valorTotal, totalItens: pedido.totalItens };
  }

  // ── Rascunho do cliente: localiza um pedido próprio em status 'rascunho' ────
  private async acharRascunho(clienteId: number, numero: string) {
    const pedido = await this.prisma.pedido.findFirst({
      where: { numero, clienteId },
      select: { id: true, status: true },
    });
    if (!pedido) throw new NotFoundException(`Pedido ${numero} não encontrado.`);
    if (pedido.status !== 'rascunho') {
      throw new NotFoundException(`Pedido ${numero} não é um rascunho editável.`);
    }
    return pedido;
  }

  /** Itens de um rascunho do cliente, para reabrir no portal. */
  async carregarRascunho(token: string, numero: string) {
    const cliente = await this.resolverCliente(token);
    const pedido = await this.prisma.pedido.findFirst({
      where: { numero, clienteId: cliente.id, status: 'rascunho' },
      select: {
        numero: true,
        observacoes: true,
        itens: { select: { servicoId: true, quantidade: true } },
      },
    });
    if (!pedido) throw new NotFoundException(`Rascunho ${numero} não encontrado.`);
    return pedido;
  }

  /** Atualiza um rascunho (itens/obs) e opcionalmente o envia. */
  async atualizarRascunho(token: string, numero: string, dto: PortalPedidoDto) {
    const cliente = await this.resolverCliente(token);
    const rasc = await this.acharRascunho(cliente.id, numero);
    const itens = await this.precificar(cliente.id, dto.itens);

    const pedido = await this.pedidos.update(rasc.id, {
      status: dto.status ?? 'rascunho',
      observacoes: dto.observacoes,
      itens,
    } as any);

    return { numero: pedido.numero, valorTotal: pedido.valorTotal, totalItens: pedido.totalItens };
  }

  /** Exclui um rascunho do cliente. */
  async excluirRascunho(token: string, numero: string) {
    const cliente = await this.resolverCliente(token);
    const rasc = await this.acharRascunho(cliente.id, numero);
    // remove() já apaga os itens antes (ItemPedido não tem cascade) e valida rascunho
    await this.pedidos.remove(rasc.id);
    return { numero, deleted: true };
  }
}
