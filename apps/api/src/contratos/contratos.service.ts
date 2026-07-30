import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MailService } from '../common/mail.service';
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

  constructor(private prisma: PrismaService, private mail: MailService) {}

  // ── Agendador leve (sem dependência): verifica de hora em hora ───────────────
  onModuleInit() {
    this.timer = setInterval(() => {
      this.rodarAlertas().catch((e) => this.logger.error(`Alerta de contratos: ${e?.message}`));
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
