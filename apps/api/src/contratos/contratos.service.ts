import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MailService } from '../common/mail.service';
import { CobrancaService } from '../cobranca/cobranca.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';

// Limiares (em dias) em que a gerência é avisada da renovação — evita e-mail
// diário repetido: só dispara quando o contrato cruza um destes marcos.
const LIMIARES_ALERTA = [30, 15, 7, 3, 1, 0];

/** Soma meses a uma data preservando o dia (ajusta fim de mês). */
function addMeses(base: Date, meses: number): Date {
  const d = new Date(base);
  const dia = d.getDate();
  d.setMonth(d.getMonth() + meses);
  // se "estourou" o mês (ex.: 31 → mês sem 31), volta pro último dia do mês alvo
  if (d.getDate() < dia) d.setDate(0);
  return d;
}

const INCLUDE = {
  cliente: { select: { id: true, nome: true, nomeFantasia: true } },
} as const;

@Injectable()
export class ContratosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('ContratosService');
  private timer?: NodeJS.Timeout;
  private ultimoDiaAlerta?: string;
  private ultimoDiaMensalidade?: string;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private cobranca: CobrancaService,
  ) {}

  // ── Agendador leve (sem dependência): verifica de hora em hora ───────────────
  onModuleInit() {
    this.timer = setInterval(() => {
      this.rodarAlertas().catch((e) => this.logger.error(`Alerta de contratos: ${e?.message}`));
      this.rodarMensalidades().catch((e) => this.logger.error(`Mensalidades de contrato: ${e?.message}`));
    }, 60 * 60 * 1000); // a cada 1h
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Avisa a gerência (e-mail) sobre contratos ativos que cruzaram um limiar de
   * vencimento (30/15/7/3/1/0 dias). Uma vez por dia, sem repetir.
   */
  async rodarAlertas(force = false) {
    const hoje = new Date();
    const chaveDia = hoje.toISOString().slice(0, 10);
    if (!force && this.ultimoDiaAlerta === chaveDia) return { ok: true, ja_rodou_hoje: true };

    const contratos = await this.findAll(true); // só ativos, já com diasParaVencer
    const aAvisar = contratos.filter((c) => LIMIARES_ALERTA.includes(c.diasParaVencer));
    this.ultimoDiaAlerta = chaveDia;
    if (aAvisar.length === 0) return { ok: true, avisados: 0 };

    // Destinatários: gerência + env opcional CONTRATO_ALERTA_EMAIL.
    const gerentes = await this.prisma.user.findMany({
      where: { role: 'gerencia', ativo: true },
      select: { email: true },
    });
    const extra = (process.env.CONTRATO_ALERTA_EMAIL || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    const para = Array.from(new Set([...gerentes.map((g) => g.email), ...extra])).filter(Boolean);
    if (para.length === 0) {
      this.logger.warn('Contratos a vencer, mas sem destinatário de alerta (nenhum gerente / CONTRATO_ALERTA_EMAIL).');
      return { ok: true, avisados: aAvisar.length, semDestinatario: true };
    }

    const linhas = aAvisar
      .map((c) => {
        const nome = c.cliente.nomeFantasia || c.cliente.nome;
        const quando = c.diasParaVencer <= 0 ? 'vence hoje' : `vence em ${c.diasParaVencer} dia(s)`;
        return `<li><strong>${nome}</strong> — R$ ${Number(c.valorMensal).toFixed(2)}/mês — ${quando} (${new Date(c.dataFim).toLocaleDateString('pt-BR')})</li>`;
      })
      .join('');
    const html = `<p>Contratos a renovar:</p><ul>${linhas}</ul><p>Abra <em>Contratos</em> no sistema para renovar.</p>`;

    const res = await this.mail.enviar({
      para,
      assunto: `Histocell — ${aAvisar.length} contrato(s) a renovar`,
      html,
    });
    return { ok: true, avisados: aAvisar.length, email: res.sent };
  }

  /**
   * Gera a mensalidade dos contratos ativos no dia de cobrança — como boleto
   * Cora DIRETO (separado do consumo, sem Fatura interna). Idempotente por mês
   * (via ultimaCobrancaEm). Sem Cora configurada, não gera nada (fica pendente).
   */
  async rodarMensalidades(force = false) {
    const hoje = new Date();
    const chaveDia = hoje.toISOString().slice(0, 10);
    if (!force && this.ultimoDiaMensalidade === chaveDia) return { ok: true, ja_rodou_hoje: true };

    const dia = hoje.getDate();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    const contratos = await this.prisma.contrato.findMany({
      where: { ativo: true, dataFim: { gte: inicioHoje } },
      select: { id: true, clienteId: true, valorMensal: true, diaCobranca: true, ultimaCobrancaEm: true },
    });
    // Devidos: dia de cobrança (clamp ao fim do mês) já chegou e ainda não
    // cobrou neste mês (idempotência + recupera se ficou um dia sem rodar).
    const devidos = contratos.filter((c) => {
      const diaCob = Math.min(c.diaCobranca, ultimoDiaMes);
      if (diaCob > dia) return false;
      if (c.ultimaCobrancaEm) {
        const u = new Date(c.ultimaCobrancaEm);
        if (u.getFullYear() === hoje.getFullYear() && u.getMonth() === hoje.getMonth()) return false;
      }
      return true;
    });

    this.ultimoDiaMensalidade = chaveDia;
    if (devidos.length === 0) return { ok: true, cobrados: 0 };

    const due = new Date(hoje);
    due.setDate(due.getDate() + 15);
    const dueDate = due.toISOString().slice(0, 10);

    const resultados: any[] = [];
    for (const c of devidos) {
      try {
        const r: any = await this.cobranca.emitirBoletoAvulso({
          clienteId: c.clienteId,
          code: `MENS-${c.id}-${anoMes.replace('-', '')}`,
          descricao: `Mensalidade contrato — ${anoMes}`,
          valor: Number(c.valorMensal),
          dueDate,
        });
        if (r.emitido) {
          await this.prisma.contrato.update({ where: { id: c.id }, data: { ultimaCobrancaEm: hoje } });
          resultados.push({ contratoId: c.id, ok: true, coraInvoiceId: r.coraInvoiceId });
        } else {
          resultados.push({ contratoId: c.id, ok: false, motivo: r.motivo });
        }
      } catch (e: any) {
        this.logger.error(`Mensalidade contrato #${c.id}: ${e?.message}`);
        resultados.push({ contratoId: c.id, ok: false, motivo: e?.message });
      }
    }
    return { ok: true, cobrados: resultados.filter((r) => r.ok).length, resultados };
  }

  private toShape(c: any) {
    const hoje = new Date();
    const fim = new Date(c.dataFim);
    const diasParaVencer = Math.ceil((fim.getTime() - hoje.getTime()) / 86400000);
    return {
      ...c,
      valorMensal: Number(c.valorMensal),
      diasParaVencer,
      vencido: diasParaVencer < 0,
    };
  }

  async create(dto: CreateContratoDto) {
    const inicio = new Date(dto.dataInicio);
    const dataFim = addMeses(inicio, dto.duracaoMeses);
    const c = await this.prisma.contrato.create({
      data: {
        clienteId: dto.clienteId,
        valorMensal: dto.valorMensal,
        dataInicio: inicio,
        duracaoMeses: dto.duracaoMeses,
        dataFim,
        diaCobranca: dto.diaCobranca,
        observacoes: dto.observacoes,
      },
      include: INCLUDE,
    });
    return this.toShape(c);
  }

  async findAll(apenasAtivos = false) {
    const contratos = await this.prisma.contrato.findMany({
      where: apenasAtivos ? { ativo: true } : {},
      include: INCLUDE,
      orderBy: [{ ativo: 'desc' }, { dataFim: 'asc' }],
    });
    return contratos.map((c) => this.toShape(c));
  }

  /** Contratos ativos vencendo dentro de `dias` (inclui os já vencidos). */
  async vencendo(dias = 30) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const contratos = await this.prisma.contrato.findMany({
      where: { ativo: true, dataFim: { lte: limite } },
      include: INCLUDE,
      orderBy: { dataFim: 'asc' },
    });
    return contratos.map((c) => this.toShape(c));
  }

  async findOne(id: number) {
    const c = await this.prisma.contrato.findUnique({ where: { id }, include: INCLUDE });
    if (!c) throw new NotFoundException(`Contrato #${id} não encontrado.`);
    return this.toShape(c);
  }

  async update(id: number, dto: UpdateContratoDto) {
    const existing = await this.prisma.contrato.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Contrato #${id} não encontrado.`);

    const data: any = { ...dto };
    if (dto.dataInicio) data.dataInicio = new Date(dto.dataInicio);
    // Recalcula o vencimento se mudou início ou duração.
    const inicio = data.dataInicio ?? existing.dataInicio;
    const duracao = dto.duracaoMeses ?? existing.duracaoMeses;
    if (dto.dataInicio || dto.duracaoMeses) data.dataFim = addMeses(new Date(inicio), duracao);

    const c = await this.prisma.contrato.update({ where: { id }, data, include: INCLUDE });
    return this.toShape(c);
  }

  /** Renova o contrato por mais `duracaoMeses` a partir do vencimento atual. */
  async renovar(id: number) {
    const existing = await this.prisma.contrato.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Contrato #${id} não encontrado.`);
    const dataFim = addMeses(new Date(existing.dataFim), existing.duracaoMeses);
    const c = await this.prisma.contrato.update({
      where: { id },
      data: { dataFim, ativo: true },
      include: INCLUDE,
    });
    return this.toShape(c);
  }

  async cancelar(id: number) {
    const existing = await this.prisma.contrato.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Contrato #${id} não encontrado.`);
    const c = await this.prisma.contrato.update({
      where: { id },
      data: { ativo: false },
      include: INCLUDE,
    });
    return this.toShape(c);
  }
}
