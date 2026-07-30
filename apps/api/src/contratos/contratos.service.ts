import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';

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
export class ContratosService {
  constructor(private prisma: PrismaService) {}

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
