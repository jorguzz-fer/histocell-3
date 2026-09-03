import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { PrecoService } from '../common/preco.service';
import { AddItemOSDto } from './dto/item-os.dto';
import { AddPecaMacroscopiaDto } from './dto/peca-macroscopia.dto';
import { EtiquetasService } from '../etiquetas/etiquetas.service';
import { CreateOrdemDto } from './dto/create-ordem.dto';
import { UpdateOrdemDto } from './dto/update-ordem.dto';
import { FilterOrdemDto } from './dto/filter-ordem.dto';
import {
  ETAPAS_ORDEM,
  ETAPAS_MOVIVEIS,
  ETAPAS_TERMINAIS,
  ETAPA_LABEL,
  ETAPA_PARA_DEPARTAMENTO,
  type EtapaOrdem,
} from './etapas';

// ─── constantes ───────────────────────────────────────────────────────────────

type Etapa = EtapaOrdem;

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function proximaEtapa(atual: Etapa): Etapa | null {
  const idx = ETAPAS_ORDEM.indexOf(atual);
  if (idx < 0) return ETAPAS_ORDEM[1] ?? null; // etapa desconhecida → segue p/ macroscopia
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
          seq: true,
          cliente: { select: { id: true, nome: true, nomeFantasia: true } },
        },
      },
    },
  },
  cliente: { select: { id: true, nome: true, nomeFantasia: true } },
  volumes: { orderBy: { id: 'asc' as const } },
  itens: {
    orderBy: { id: 'asc' as const },
    include: { servico: { select: { id: true, codigo: true, nome: true, categoria: true } } },
  },
  etapas: { orderBy: { id: 'asc' as const } },
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class OrdensService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private preco: PrecoService,
    private etiquetas: EtiquetasService,
  ) {}

  /**
   * Espelha a etapa atual da OS no Rastreio das etiquetas da amostra, para que a
   * posição do material no "rastreio do pedido" acompanhe o avanço na Fila mesmo
   * quando não houve um scan físico de código de barras. Antes deste bridge, a
   * Fila (OrdemServico.etapaAtual) e o Rastreio (Etiqueta.departamentoAtual)
   * eram sistemas desacoplados: os itens corriam na Fila mas o rastreio do
   * pedido não entrava. Best-effort — nunca derruba o avanço da OS.
   */
  private async sincronizarRastreio(
    ref: { amostraId: number | null; ordemServicoId: number },
    etapa: EtapaOrdem,
    opts: { responsavel?: string; concluir?: boolean } = {},
  ) {
    try {
      const departamento = ETAPA_PARA_DEPARTAMENTO[etapa];
      if (!departamento) return;

      // Etiquetas da amostra E as geradas direto na OS (cassetes da Entrada).
      const etiquetas = await this.prisma.etiqueta.findMany({
        where: {
          OR: [
            ...(ref.amostraId != null ? [{ amostraId: ref.amostraId }] : []),
            { ordemServicoId: ref.ordemServicoId },
          ],
        },
        select: { id: true, departamentoAtual: true },
      });
      if (etiquetas.length === 0) return;

      const agora = new Date();
      const rastreioStatus = opts.concluir ? 'concluido' : 'em_andamento';
      const responsavel = opts.responsavel?.trim() || 'Sistema (Fila)';

      const ops: any[] = [];
      for (const et of etiquetas) {
        // Evita evento duplicado quando já está no mesmo departamento (a menos
        // que seja a conclusão, que registra a saída do fluxo).
        if (et.departamentoAtual !== departamento || opts.concluir) {
          ops.push(
            this.prisma.rastreioEvento.create({
              data: {
                etiquetaId: et.id,
                departamento,
                tipo: opts.concluir ? 'saida' : 'entrada',
                scannedPor: responsavel,
                observacoes: 'Sincronizado pelo avanço da OS na Fila',
              },
            }),
          );
        }
        ops.push(
          this.prisma.etiqueta.update({
            where: { id: et.id },
            data: {
              departamentoAtual: departamento,
              rastreioStatus,
              ultimoEventoEm: agora,
              ultimoResponsavel: responsavel,
            },
          }),
        );
      }
      await this.prisma.$transaction(ops);
    } catch {
      // Sincronização de rastreio é best-effort: não deve bloquear a OS.
    }
  }

  /** Muda o status da amostra da OS. No-op quando a OS nasceu na Entrada. */
  private async atualizarStatusAmostra(amostraId: number | null, status: string) {
    if (amostraId == null) return;
    await this.prisma.amostra.update({ where: { id: amostraId }, data: { status } });
  }

  // ── número sequencial diário ─────────────────────────────────────────────────
  // Usa o MAIOR sufixo existente + 1 (não count+1): resiste a lacunas deixadas
  // por OS canceladas/removidas, evitando gerar um número já usado (P2002).
  private async gerarNumero(): Promise<string> {
    const hoje = toDateStr(new Date());
    const prefix = `OS-${hoje}-`;
    const existentes = await this.prisma.ordemServico.findMany({
      where: { numero: { startsWith: prefix } },
      select: { numero: true },
    });
    const maxSeq = existentes.reduce((max, o) => {
      const n = parseInt(o.numero.slice(prefix.length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  }

  // Código curto sequencial (exibição) da OS — global, à prova de buracos.
  private async gerarSeq(): Promise<number> {
    const ultimo = await this.prisma.ordemServico.findFirst({
      where: { seq: { not: null } },
      orderBy: { seq: 'desc' },
      select: { seq: true },
    });
    return (ultimo?.seq ?? 0) + 1;
  }

  /** Cria OS automaticamente para uma amostra (usado pelo Recebimento). */
  async criarAuto(
    amostraId: number,
    etapaInicial: string = 'macroscopia',
    opts: { prioridade?: string; responsavel?: string; userId?: number } = {},
  ) {
    const agora = new Date();
    const idxInicial = ETAPAS_ORDEM.indexOf(etapaInicial as Etapa);
    const dadosEtapas = ETAPAS_ORDEM.map((etapa, i) => {
      // Cria todas as etapas do fluxo (como no create manual) para que o
      // avançar registre iniciadoEm/concluidoEm de cada uma. As anteriores à
      // etapa inicial já nascem concluídas (foram puladas pelo recebimento).
      if (idxInicial >= 0 && i < idxInicial) {
        return { etapa, status: 'concluida', iniciadoEm: agora, concluidoEm: agora };
      }
      if (i === idxInicial) {
        return { etapa, status: 'em_andamento', iniciadoEm: agora };
      }
      return { etapa, status: 'pendente' };
    });

    // Retry curto em caso de colisão de número (P2002) sob concorrência:
    // gerarNumero relê o máximo a cada tentativa, então converge.
    let os: any;
    for (let tentativa = 0; ; tentativa++) {
      const numero = await this.gerarNumero();
      const seq = await this.gerarSeq();
      try {
        os = await this.prisma.ordemServico.create({
          data: {
            amostraId,
            numero,
            seq,
            etapaAtual: etapaInicial,
            status: 'em_andamento',
            prioridade: opts.prioridade ?? 'normal',
            responsavel: opts.responsavel,
            iniciadoEm: agora,
            etapas: { create: dadosEtapas },
          },
        });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002' && tentativa < 4) continue;
        throw e;
      }
    }
    // amostra entra em processamento (a OS assumiu)
    await this.prisma.amostra.update({
      where: { id: amostraId },
      data: { status: 'em_processamento' },
    });
    // Espelha a posição inicial no rastreio das etiquetas do pedido.
    await this.sincronizarRastreio({ amostraId, ordemServicoId: os.id }, etapaInicial as EtapaOrdem, {
      responsavel: opts.responsavel,
    });
    if (opts.userId) {
      await this.audit.log(opts.userId, 'CREATE_AUTO', 'OrdemServico', os.id, { amostraId, etapaInicial });
    }
    return os;
  }

  /**
   * Cria a OS da Entrada: nasce sem amostra, ligada ao cliente e aos volumes
   * que chegaram. A etapa inicial vem da condição do material — molhado abre na
   * Macroscopia, seco vai direto ao corte. É nesta OS que a equipe confirma o
   * serviço a executar.
   */
  async criarDaEntrada(
    clienteId: number,
    etapaInicial: string,
    opts: { recipienteIds?: number[]; responsavel?: string; userId?: number } = {},
  ) {
    const agora = new Date();
    const idxInicial = ETAPAS_ORDEM.indexOf(etapaInicial as Etapa);
    const dadosEtapas = ETAPAS_ORDEM.map((etapa, i) => {
      // Etapas anteriores à inicial nascem concluídas: o material chegou já
      // naquele ponto do fluxo (seco não passa pela macroscopia, por exemplo).
      if (idxInicial >= 0 && i < idxInicial) {
        return { etapa, status: 'concluida', iniciadoEm: agora, concluidoEm: agora };
      }
      if (i === idxInicial) return { etapa, status: 'em_andamento', iniciadoEm: agora };
      return { etapa, status: 'pendente' };
    });

    // Mesmo retry do criarAuto: gerarNumero relê o máximo, então converge.
    let os: any;
    for (let tentativa = 0; ; tentativa++) {
      const numero = await this.gerarNumero();
      const seq = await this.gerarSeq();
      try {
        os = await this.prisma.ordemServico.create({
          data: {
            origem: 'entrada',
            clienteId,
            numero,
            seq,
            etapaAtual: etapaInicial,
            status: 'em_andamento',
            responsavel: opts.responsavel,
            iniciadoEm: agora,
            etapas: { create: dadosEtapas },
          },
        });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002' && tentativa < 4) continue;
        throw e;
      }
    }

    if (opts.recipienteIds?.length) {
      await this.prisma.recipiente.updateMany({
        where: { id: { in: opts.recipienteIds } },
        data: { ordemServicoId: os.id },
      });
    }
    if (opts.userId) {
      await this.audit.log(opts.userId, 'CREATE_ENTRADA', 'OrdemServico', os.id, {
        clienteId,
        etapaInicial,
        volumes: opts.recipienteIds?.length ?? 0,
      });
    }
    return os;
  }

  // ── Serviços que a OS vai executar ───────────────────────────────────────────
  // A lista do orçamento é estimativa; esta é o que a equipe confirmou ao
  // conferir o material. É daqui que a execução (e, adiante, a cobrança) parte.

  /** Cliente da OS, venha ela da entrada ou do fluxo antigo (via amostra). */
  private async clienteDaOS(ordemServicoId: number): Promise<number | null> {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      select: {
        clienteId: true,
        amostra: { select: { pedido: { select: { clienteId: true } } } },
      },
    });
    if (!os) throw new NotFoundException(`OS #${ordemServicoId} não encontrada.`);
    return os.clienteId ?? os.amostra?.pedido.clienteId ?? null;
  }

  async listarItens(ordemServicoId: number) {
    const itens = await this.prisma.itemOrdemServico.findMany({
      where: { ordemServicoId },
      include: { servico: { select: { id: true, codigo: true, nome: true, categoria: true } } },
      orderBy: { id: 'asc' },
    });
    return itens.map((i) => ({
      ...i,
      preco: Number(i.preco),
      desconto: Number(i.desconto),
      total: Number(i.preco) * i.quantidade * (1 - Number(i.desconto) / 100),
    }));
  }

  async adicionarItem(ordemServicoId: number, dto: AddItemOSDto, userId?: number) {
    const clienteId = await this.clienteDaOS(ordemServicoId);
    const servico = await this.prisma.servico.findUnique({ where: { id: dto.servicoId } });
    if (!servico) throw new NotFoundException(`Serviço #${dto.servicoId} não encontrado.`);

    // Trava por contagem (reunião 02/09): se a condição já tem tantas unidades
    // lançadas quanto volumes recebidos, o quadrado está "fechado". Lançar mais
    // só com liberação da gerência (forcar + justificativa) — guiar sem travar.
    const qtd = dto.quantidade ?? 1;
    if (dto.condicao) {
      const quadros = await this.quadrosDaOS(ordemServicoId);
      const q = quadros.find((x) => x.condicao === dto.condicao);
      if (q && q.completo) {
        if (!dto.forcar) {
          throw new BadRequestException(
            `O quadro "${dto.condicao}" já está completo (${q.unidades}/${q.volumes}). ` +
              `Libere com justificativa (gerência) para lançar mais.`,
          );
        }
        if (!dto.justificativa?.trim()) {
          throw new BadRequestException('Informe a justificativa para reabrir o quadro.');
        }
      }
    }

    // Preço informado manda; senão vale a tabela do cliente. Sem cliente (caso
    // que o schema não permite hoje, mas o código não deve presumir), cai no
    // preço base do serviço.
    let preco = dto.preco;
    let desconto = dto.desconto;
    if (preco == null && clienteId != null) {
      const tabela = await this.preco.getPreco(clienteId, dto.servicoId);
      preco = tabela.preco;
      desconto = desconto ?? tabela.desconto;
    }

    const item = await this.prisma.itemOrdemServico.create({
      data: {
        ordemServicoId,
        servicoId: dto.servicoId,
        quantidade: qtd,
        preco: preco ?? Number(servico.precoBase),
        desconto: desconto ?? 0,
        observacoes: dto.observacoes,
        condicao: dto.condicao,
      },
      include: { servico: { select: { id: true, codigo: true, nome: true, categoria: true } } },
    });
    if (userId) {
      await this.audit.log(userId, 'ADD_ITEM', 'OrdemServico', ordemServicoId, {
        servicoId: dto.servicoId,
        condicao: dto.condicao,
      });
      if (dto.forcar && dto.justificativa) {
        await this.audit.log(userId, 'REABRIR_QUADRO', 'OrdemServico', ordemServicoId, {
          condicao: dto.condicao,
          justificativa: dto.justificativa.trim(),
        });
      }
    }
    return { ...item, preco: Number(item.preco), desconto: Number(item.desconto) };
  }

  async removerItem(itemId: number, userId?: number) {
    const item = await this.prisma.itemOrdemServico.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Item #${itemId} não encontrado.`);
    await this.prisma.itemOrdemServico.delete({ where: { id: itemId } });
    if (userId) {
      await this.audit.log(userId, 'REMOVE_ITEM', 'OrdemServico', item.ordemServicoId, { itemId });
    }
    return { id: itemId, deleted: true };
  }

  /**
   * Quadros seco × molhado × macroscopia da OS (reunião 02/09). Para cada
   * condição presente nos volumes recebidos, compara quantos volumes chegaram
   * com quantas unidades de serviço já foram lançadas. O quadrado "fecha"
   * quando as unidades alcançam os volumes — a partir daí, lançar mais exige
   * liberação da gerência.
   */
  async quadrosDaOS(ordemServicoId: number) {
    const [volumes, itens] = await Promise.all([
      this.prisma.recipiente.findMany({
        where: { ordemServicoId },
        select: { condicao: true },
      }),
      this.prisma.itemOrdemServico.findMany({
        where: { ordemServicoId },
        select: { condicao: true, quantidade: true, encaminhadoEm: true },
      }),
    ]);
    const condicoes = Array.from(
      new Set([
        ...volumes.map((v) => v.condicao).filter((c): c is string => !!c),
        ...itens.map((i) => i.condicao).filter((c): c is string => !!c),
      ]),
    );
    return condicoes.map((condicao) => {
      const nVolumes = volumes.filter((v) => v.condicao === condicao).length;
      const itensCond = itens.filter((i) => i.condicao === condicao);
      const unidades = itensCond.reduce((s, i) => s + i.quantidade, 0);
      const encaminhados = itensCond.filter((i) => i.encaminhadoEm).length;
      return {
        condicao,
        volumes: nVolumes,
        unidades,
        // "Fechado" só faz sentido quando sabemos quantos volumes esperar.
        completo: nVolumes > 0 && unidades >= nVolumes,
        encaminhados,
        totalItens: itensCond.length,
      };
    });
  }

  /** Marca os itens de uma condição como encaminhados à área técnica. */
  async encaminharCondicao(ordemServicoId: number, condicao: string, userId?: number) {
    const agora = new Date();
    const responsavel = userId ? await this.nomeDoUsuario(userId) : undefined;
    const res = await this.prisma.itemOrdemServico.updateMany({
      where: { ordemServicoId, condicao, encaminhadoEm: null },
      data: { encaminhadoEm: agora, encaminhadoPor: responsavel ?? null },
    });
    if (res.count === 0) {
      throw new BadRequestException(
        `Nenhum serviço "${condicao}" pendente de encaminhamento nesta OS.`,
      );
    }
    if (userId) {
      await this.audit.log(userId, 'ENCAMINHAR_TECNICA', 'OrdemServico', ordemServicoId, {
        condicao,
        itens: res.count,
      });
    }
    return { message: `${res.count} serviço(s) ${condicao} encaminhado(s) à técnica.`, count: res.count };
  }

  private async nomeDoUsuario(userId: number): Promise<string | undefined> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { nome: true } });
    return u?.nome;
  }

  // ── Ficha de Macroscopia ──────────────────────────────────────────────────────

  /** Volumes de macroscopia (potes com paciente) + peças já descritas. */
  async listarMacroscopia(ordemServicoId: number) {
    const [volumes, pecas] = await Promise.all([
      this.prisma.recipiente.findMany({
        where: { ordemServicoId, condicao: 'macroscopia' },
        select: { id: true, tipo: true, paciente: true, codigo: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.pecaMacroscopia.findMany({
        where: { ordemServicoId },
        orderBy: { id: 'asc' },
      }),
    ]);
    return { volumes, pecas };
  }

  async adicionarPeca(ordemServicoId: number, dto: AddPecaMacroscopiaDto, userId?: number) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      select: { id: true },
    });
    if (!os) throw new NotFoundException(`OS #${ordemServicoId} não encontrada.`);

    let servicoCodigo: string | null = null;
    let servicoNome: string | null = null;
    let coloracao: string | null = null;
    if (dto.servicoId != null) {
      const servico = await this.prisma.servico.findUnique({
        where: { id: dto.servicoId },
        select: { codigo: true, nome: true },
      });
      if (!servico) throw new NotFoundException(`Serviço #${dto.servicoId} não encontrado.`);
      servicoCodigo = servico.codigo;
      servicoNome = servico.nome;
    }

    const peca = await this.prisma.pecaMacroscopia.create({
      data: {
        ordemServicoId,
        recipienteId: dto.recipienteId,
        paciente: dto.paciente?.trim() || null,
        descricao: dto.descricao.trim(),
        medidas: dto.medidas?.trim() || null,
        caracteristicas: dto.caracteristicas?.trim() || null,
        cor: dto.cor?.trim() || null,
        consistencia: dto.consistencia?.trim() || null,
        observacoes: dto.observacoes?.trim() || null,
        numeroCassetes: dto.numeroCassetes,
        servicoId: dto.servicoId ?? null,
        servicoCodigo,
        servicoNome,
        coloracao,
      },
    });
    if (userId) {
      await this.audit.log(userId, 'ADD_PECA_MACRO', 'OrdemServico', ordemServicoId, {
        pecaId: peca.id,
        descricao: peca.descricao,
      });
    }
    return peca;
  }

  async removerPeca(pecaId: number, userId?: number) {
    const peca = await this.prisma.pecaMacroscopia.findUnique({ where: { id: pecaId } });
    if (!peca) throw new NotFoundException(`Peça #${pecaId} não encontrada.`);
    await this.prisma.pecaMacroscopia.delete({ where: { id: pecaId } });
    if (userId) {
      await this.audit.log(userId, 'REMOVE_PECA_MACRO', 'OrdemServico', peca.ordemServicoId, {
        pecaId,
      });
    }
    return { id: pecaId, deleted: true };
  }

  /**
   * Conclui a macroscopia: cada peça vira um item de serviço (cobrança) e gera
   * as etiquetas de cassete; a OS avança para o Processamento. Exige que toda
   * peça tenha serviço definido — é a peça que determina a cobrança.
   */
  async concluirMacroscopia(ordemServicoId: number, userId: number) {
    const pecas = await this.prisma.pecaMacroscopia.findMany({
      where: { ordemServicoId },
      orderBy: { id: 'asc' },
    });
    if (pecas.length === 0) {
      throw new BadRequestException('Descreva ao menos uma peça antes de concluir.');
    }
    const semServico = pecas.filter((p) => p.servicoId == null);
    if (semServico.length > 0) {
      throw new BadRequestException(
        `Defina o serviço de todas as peças antes de concluir (${semServico.length} sem serviço).`,
      );
    }

    let totalCassetes = 0;
    for (const peca of pecas) {
      // Item de cobrança da peça — condição molhado (a peça vira cassete).
      const item = await this.adicionarItem(
        ordemServicoId,
        { servicoId: peca.servicoId!, quantidade: peca.numeroCassetes, condicao: 'molhado' },
        userId,
      );
      // Etiquetas de cassete: identificação = paciente + peça + sequência (a
      // peça entra no rótulo para não colidir quando o paciente tem várias).
      const base = [peca.paciente, peca.descricao].filter(Boolean).join(' ');
      const idents = Array.from({ length: peca.numeroCassetes }, (_, i) => `${base} ${i + 1}`);
      await this.etiquetas.gerarParaOS(ordemServicoId, {
        identificacoes: idents,
        itemOrdemServicoId: item.id,
        tipo: 'cassete',
      });
      totalCassetes += peca.numeroCassetes;
    }

    await this.audit.log(userId, 'CONCLUIR_MACROSCOPIA', 'OrdemServico', ordemServicoId, {
      pecas: pecas.length,
      cassetes: totalCassetes,
    });

    // Avança a etapa (macroscopia → processamento).
    await this.avancar(ordemServicoId, userId);

    return {
      message: `Macroscopia concluída: ${pecas.length} peça(s), ${totalCassetes} cassete(s). OS avançada.`,
      pecas: pecas.length,
      cassetes: totalCassetes,
    };
  }

  /**
   * Cria OS automática (Macroscopia) para TODAS as amostras de um pedido que
   * ainda não têm OS. Best-effort POR AMOSTRA: a falha de uma não derruba as
   * demais — mas NUNCA é silenciosa: é logada, auditada e contabilizada em
   * `falhas`, para que o chamador possa avisar o operador.
   */
  async criarAutoParaPedido(
    pedidoId: number,
    opts: { prioridade?: string; responsavel?: string; userId?: number } = {},
  ): Promise<{ criadas: number; falhas: number }> {
    const amostras = await this.prisma.amostra.findMany({
      where: { pedidoId, ordemServico: null },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    let criadas = 0;
    let falhas = 0;
    for (const a of amostras) {
      try {
        await this.criarAuto(a.id, 'macroscopia', opts);
        criadas++;
      } catch (e: any) {
        falhas++;
        // Não silenciar: sem OS a amostra some da Fila. Registra para diagnóstico.
        console.error(
          `[OS auto] Falha ao criar OS da amostra #${a.id} (pedido #${pedidoId}):`,
          e?.message ?? e,
        );
        if (opts.userId) {
          await this.audit
            .log(opts.userId, 'CREATE_AUTO_FALHA', 'Amostra', a.id, {
              pedidoId,
              erro: String(e?.message ?? e),
            })
            .catch(() => {});
        }
      }
    }
    return { criadas, falhas };
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
        { cliente: { nome:         { contains: filter.busca, mode: 'insensitive' } } },
        { cliente: { nomeFantasia: { contains: filter.busca, mode: 'insensitive' } } },
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
  async create(dto: CreateOrdemDto, userId: number) {
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
    const seq = await this.gerarSeq();

    const os = await this.prisma.ordemServico.create({
      data: {
        amostraId: dto.amostraId,
        numero,
        seq,
        status: 'fila',
        etapaAtual: 'triagem',
        prioridade: dto.prioridade ?? 'normal',
        responsavel: dto.responsavel,
        responsavelUserId: dto.responsavelUserId ?? null,
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

    await this.audit.log(userId, 'CREATE', 'OrdemServico', os.id, { amostraId: dto.amostraId });

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
  // ── Conferência fina (bipagem das lâminas antes da expedição) ─────────────────
  async statusConferencia(osId: number) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      select: {
        id: true, numero: true, amostraId: true, conferenciaLiberada: true, conferenciaObs: true,
        saidaConferidaEm: true, saidaConferidaPor: true,
      },
    });
    if (!os) throw new NotFoundException(`OS #${osId} não encontrada.`);
    // Etiquetas da amostra (fluxo do pedido) E as geradas direto na OS
    // (cassetes identificados na tela de Serviços) — ambas entram na bipagem.
    const etiquetas = await this.prisma.etiqueta.findMany({
      where: {
        OR: [
          ...(os.amostraId != null ? [{ amostraId: os.amostraId }] : []),
          { ordemServicoId: os.id },
        ],
      },
      select: { id: true, codigo: true, numero: true, laminaSeq: true, coloracao: true, identificacao: true, conferidaEm: true, conferidaPor: true },
      orderBy: { laminaSeq: 'asc' },
    });
    const conferidas = etiquetas.filter((e) => e.conferidaEm).length;
    return {
      esperado: etiquetas.length,
      conferidas,
      faltantes: etiquetas.length - conferidas,
      // Etiquetas completas ≠ saída liberada: falta o carimbo final abaixo.
      completo: conferidas === etiquetas.length,
      // Bipagem de saída (regra do Célio): TODA OS precisa do próprio código
      // bipado para concluir. É o que cobre o serviço que não gera etiqueta —
      // antes, "zero de zero lâminas" passava direto, sem nenhum ato de entrega.
      osNumero: os.numero,
      saidaConferida: os.saidaConferidaEm != null,
      saidaConferidaEm: os.saidaConferidaEm,
      saidaConferidaPor: os.saidaConferidaPor,
      liberada: os.conferenciaLiberada,
      obs: os.conferenciaObs,
      etiquetas,
    };
  }

  /** Bipa um código na conferência de saída: etiqueta da amostra OU o código da própria OS. */
  async conferir(osId: number, codigo: string, userId: number) {
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: osId },
      select: { amostraId: true, numero: true },
    });
    if (!os) throw new NotFoundException(`OS #${osId} não encontrada.`);
    const alvo = (codigo ?? '').trim();

    // Bipar o código da OS é o carimbo final de entrega — funciona em qualquer
    // OS, inclusive a da Entrada (sem amostra e sem etiqueta para bipar).
    if (alvo.toUpperCase() === os.numero.toUpperCase()) {
      const nome = await this.nomeUsuario(userId);
      await this.prisma.ordemServico.update({
        where: { id: osId },
        data: { saidaConferidaEm: new Date(), saidaConferidaPor: nome },
      });
      await this.audit.log(userId, 'CONFERE_SAIDA_OS', 'OrdemServico', osId, {});
      return this.statusConferencia(osId);
    }

    // Aceita o código exato, um número puro, OU o primeiro grupo de dígitos de
    // um texto composto (ex.: "00000032 - 17062026") — mesmo comportamento do rastreio.
    const grupoDigitos = alvo.match(/\d+/);
    const asNumero = grupoDigitos ? parseInt(grupoDigitos[0], 10) : -1;
    const et = await this.prisma.etiqueta.findFirst({
      where: {
        // pertence à OS: pela amostra (fluxo do pedido) ou direto (cassete da OS)
        OR: [
          ...(os.amostraId != null ? [{ amostraId: os.amostraId }] : []),
          { ordemServicoId: osId },
        ],
        AND: { OR: [{ codigo: alvo }, { numero: Number.isNaN(asNumero) ? -1 : asNumero }] },
      },
      select: { id: true },
    });
    if (!et) throw new BadRequestException(`Etiqueta "${alvo}" não pertence a esta OS.`);
    const nome = await this.nomeUsuario(userId);
    await this.prisma.etiqueta.update({ where: { id: et.id }, data: { conferidaEm: new Date(), conferidaPor: nome } });
    return this.statusConferencia(osId);
  }

  /** Libera a conferência incompleta com justificativa (destrava a expedição). */
  async liberarConferencia(osId: number, obs: string, userId: number) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id: osId }, select: { id: true } });
    if (!os) throw new NotFoundException(`OS #${osId} não encontrada.`);
    if (!obs?.trim()) throw new BadRequestException('Informe a justificativa para liberar com pendência.');
    await this.prisma.ordemServico.update({
      where: { id: osId },
      data: { conferenciaLiberada: true, conferenciaObs: obs.trim() },
    });
    await this.audit.log(userId, 'LIBERA_CONFERENCIA', 'OrdemServico', osId, { obs });
    return this.statusConferencia(osId);
  }

  private async nomeUsuario(userId: number): Promise<string | undefined> {
    if (!userId) return undefined;
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { nome: true } });
    return u?.nome;
  }

  /** OS com conferência incompleta (relatório de pendências). */
  async pendencias() {
    const ativas = await this.prisma.ordemServico.findMany({
      where: { status: { in: ['fila', 'em_andamento'] } },
      select: {
        id: true, numero: true, etapaAtual: true, amostraId: true, conferenciaLiberada: true,
        amostra: {
          select: {
            numeroInterno: true,
            pedido: { select: { numero: true, cliente: { select: { nome: true, nomeFantasia: true } } } },
          },
        },
      },
      orderBy: { iniciadoEm: 'asc' },
    });
    // Só OS com amostra entram: sem ela não há lâmina para conferir.
    const comAmostra = ativas.filter(
      (o): o is typeof o & { amostraId: number; amostra: NonNullable<typeof o.amostra> } =>
        o.amostraId != null && o.amostra != null,
    );
    const ids = comAmostra.map((o) => o.amostraId);
    const grupos = await this.prisma.etiqueta.groupBy({
      by: ['amostraId'],
      where: { amostraId: { in: ids } },
      _count: { _all: true },
    });
    const conf = await this.prisma.etiqueta.groupBy({
      by: ['amostraId'],
      where: { amostraId: { in: ids }, conferidaEm: { not: null } },
      _count: { _all: true },
    });
    const total = new Map(grupos.map((g) => [g.amostraId, g._count?._all ?? 0]));
    const feitas = new Map(conf.map((g) => [g.amostraId, g._count?._all ?? 0]));
    return comAmostra
      .map((o) => {
        const esperado = total.get(o.amostraId) ?? 0;
        const conferidas = feitas.get(o.amostraId) ?? 0;
        return {
          osId: o.id, numero: o.numero, etapaAtual: o.etapaAtual,
          cliente: o.amostra.pedido.cliente.nomeFantasia ?? o.amostra.pedido.cliente.nome,
          pedido: o.amostra.pedido.numero, amostra: o.amostra.numeroInterno,
          esperado, conferidas, faltantes: esperado - conferidas, liberada: o.conferenciaLiberada,
        };
      })
      .filter((o) => o.esperado > 0 && o.faltantes > 0 && !o.liberada);
  }

  async avancar(id: number, userId: number) {
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

    // Trava: sair da Finalização exige as etiquetas todas bipadas E o código da
    // própria OS bipado (carimbo de entrega) — ou a liberação com justificativa.
    if (etapaAtual === 'finalizacao') {
      const conf = await this.statusConferencia(id);
      if (!conf.liberada) {
        if (!conf.completo) {
          throw new BadRequestException(
            `Conferência de saída incompleta (${conf.conferidas}/${conf.esperado} lâminas). Bipe todas as lâminas ou libere com justificativa.`,
          );
        }
        if (!conf.saidaConferida) {
          throw new BadRequestException(
            `Falta o carimbo de saída: bipe o código da OS (${conf.osNumero}) para confirmar a entrega, ou libere com justificativa.`,
          );
        }
      }
    }

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
      await this.atualizarStatusAmostra(os.amostraId, 'concluida');
      // Conclui o rastreio das etiquetas (saída do departamento final).
      await this.sincronizarRastreio({ amostraId: os.amostraId, ordemServicoId: id }, etapaAtual, {
        responsavel: os.responsavel ?? undefined,
        concluir: true,
      });
      await this.audit.log(userId, 'AVANCO_ETAPA', 'OrdemServico', id, { de: etapaAtual, para: proxima });
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

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: dataFields,
      include: INCLUDE_OS,
    });

    // Espelha o novo departamento no rastreio das etiquetas do pedido.
    await this.sincronizarRastreio({ amostraId: os.amostraId, ordemServicoId: id }, proxima, {
      responsavel: os.responsavel ?? undefined,
    });

    await this.audit.log(userId, 'AVANCO_ETAPA', 'OrdemServico', id, { de: etapaAtual, para: proxima });

    return updated;
  }

  /**
   * Move a OS para um departamento qualquer (ação "Mover para" da Fila), fora do
   * avanço linear — para desvios como Imunofluorescência ou destinos de fim de
   * linha (Arquivamento/Descarte). Mover para um departamento terminal CONCLUI a
   * OS. É uma ação manual e deliberada: não aplica a trava da conferência fina.
   */
  async moverPara(id: number, destino: string, userId: number) {
    if (!ETAPAS_MOVIVEIS.includes(destino)) {
      throw new BadRequestException(`Departamento inválido: "${destino}".`);
    }
    const os = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: { etapas: true },
    });
    if (!os) throw new NotFoundException(`OS #${id} não encontrada.`);
    if (os.status === 'cancelada') {
      throw new BadRequestException('OS cancelada não pode ser movida.');
    }
    if (os.etapaAtual === destino) {
      throw new BadRequestException(`A OS já está em ${ETAPA_LABEL[destino] ?? destino}.`);
    }

    const agora = new Date();
    const etapaOrigem = os.etapaAtual;
    const terminal = ETAPAS_TERMINAIS.includes(destino);

    const dataFields: any = { etapaAtual: destino };
    if (terminal) {
      // Arquivamento / Descarte: fim de linha → conclui a OS.
      dataFields.status = 'concluida';
      dataFields.concluidoEm = agora;
    } else {
      // Reabre/mantém em andamento (permite tirar um item de um terminal também).
      dataFields.status = 'em_andamento';
      dataFields.concluidoEm = null;
      if (!os.iniciadoEm) dataFields.iniciadoEm = agora;
    }

    // Se o destino for uma etapa da linha principal (tem EtapaOS), marca-a
    // como em andamento; departamentos extras não têm EtapaOS.
    const destinoRecord = os.etapas.find((e) => e.etapa === destino);
    if (destinoRecord && !terminal) {
      await this.prisma.etapaOS.update({
        where: { id: destinoRecord.id },
        data: { status: 'em_andamento', iniciadoEm: destinoRecord.iniciadoEm ?? agora },
      });
    }

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: dataFields,
      include: INCLUDE_OS,
    });

    await this.atualizarStatusAmostra(os.amostraId, terminal ? 'concluida' : 'em_processamento');

    // Espelha o destino no rastreio das etiquetas do pedido.
    await this.sincronizarRastreio({ amostraId: os.amostraId, ordemServicoId: id }, destino as EtapaOrdem, {
      responsavel: os.responsavel ?? undefined,
      concluir: terminal,
    });

    await this.audit.log(userId, 'MOVER_ETAPA', 'OrdemServico', id, {
      de: etapaOrigem,
      para: destino,
      concluiu: terminal,
    });

    return updated;
  }

  // ── CANCELAR ─────────────────────────────────────────────────────────────────
  async cancelar(id: number, userId: number) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id } });
    if (!os) throw new NotFoundException(`OS #${id} não encontrada.`);
    if (os.status === 'concluida') throw new BadRequestException('OS concluída não pode ser cancelada.');
    if (os.status === 'cancelada') throw new BadRequestException('OS já cancelada.');

    const updated = await this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'cancelada' },
      include: INCLUDE_OS,
    });

    await this.atualizarStatusAmostra(os.amostraId, 'pendente');

    await this.audit.log(userId, 'CANCEL', 'OrdemServico', id, { amostraId: os.amostraId });

    return updated;
  }
}
