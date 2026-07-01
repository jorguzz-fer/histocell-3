import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MailService } from '../common/mail.service';

function aplicarTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

@Injectable()
export class ComunicacaoService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  // ── Motivos ─────────────────────────────────────────────────────────────────
  listarMotivos(setor?: string, incluirInativos = false) {
    return this.prisma.motivo.findMany({
      where: { ...(setor ? { setor } : {}), ...(incluirInativos ? {} : { ativo: true }) },
      orderBy: [{ setor: 'asc' }, { titulo: 'asc' }],
    });
  }
  criarMotivo(dto: { setor: string; titulo: string; mensagemTemplate: string; notificaCliente?: boolean }) {
    return this.prisma.motivo.create({ data: { ...dto, notificaCliente: dto.notificaCliente ?? true } });
  }
  async atualizarMotivo(id: number, dto: any) {
    const m = await this.prisma.motivo.findUnique({ where: { id } });
    if (!m) throw new NotFoundException(`Motivo #${id} não encontrado.`);
    return this.prisma.motivo.update({ where: { id }, data: dto });
  }
  async removerMotivo(id: number) {
    await this.prisma.motivo.update({ where: { id }, data: { ativo: false } }).catch(() => {});
    return { id, arquivado: true };
  }

  // ── Dados do pedido para montar a mensagem ────────────────────────────────────
  private async dadosPedido(pedidoId: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true, numero: true, cliente: { select: { nome: true, nomeFantasia: true, email: true, emailFinanceiro: true } } },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} não encontrado.`);
    const clienteNome = pedido.cliente.nomeFantasia ?? pedido.cliente.nome;
    const email = pedido.cliente.email || pedido.cliente.emailFinanceiro || '';
    return { pedido, clienteNome, email };
  }

  private async registrar(data: {
    pedidoId?: number; ordemServicoId?: number; setor: string; tipo: string;
    assunto: string; mensagem: string; destinatario?: string; criadoPor?: string; notificar: boolean;
  }) {
    let emailEnviado = false;
    let emailInfo: string | undefined;
    if (data.notificar && data.destinatario) {
      const r = await this.mail.enviar({ para: data.destinatario, assunto: data.assunto, texto: data.mensagem });
      emailEnviado = r.sent;
      emailInfo = r.sent ? r.id : r.motivo;
    }
    return this.prisma.comunicacao.create({
      data: {
        pedidoId: data.pedidoId, ordemServicoId: data.ordemServicoId, setor: data.setor, tipo: data.tipo,
        assunto: data.assunto, mensagem: data.mensagem, destinatario: data.destinatario,
        criadoPor: data.criadoPor, emailEnviado, emailInfo,
      },
    });
  }

  // ── E3: registrar ocorrência (motivo) ─────────────────────────────────────────
  async registrarOcorrencia(dto: {
    pedidoId: number; ordemServicoId?: number; motivoId?: number; setor?: string;
    obs?: string; itens?: string; notificarCliente?: boolean;
  }, criadoPor?: string) {
    const { pedido, clienteNome, email } = await this.dadosPedido(dto.pedidoId);
    const motivo = dto.motivoId ? await this.prisma.motivo.findUnique({ where: { id: dto.motivoId } }) : null;
    const setor = dto.setor ?? motivo?.setor ?? 'geral';
    const tpl = motivo?.mensagemTemplate ?? '{obs}';
    const mensagem = aplicarTemplate(tpl, {
      cliente: clienteNome, pedido: pedido.numero, obs: dto.obs ?? '', itens: dto.itens ?? '',
    }).trim();
    const assunto = `Histocell — pedido ${pedido.numero}${motivo ? ' · ' + motivo.titulo : ''}`;
    const notificar = (dto.notificarCliente ?? motivo?.notificaCliente ?? true) && !!email;
    return this.registrar({
      pedidoId: pedido.id, ordemServicoId: dto.ordemServicoId, setor, tipo: 'ocorrencia',
      assunto, mensagem, destinatario: email || undefined, criadoPor, notificar,
    });
  }

  // ── E4: notificar material pronto / retirada (com liberação parcial) ──────────
  async notificarPronto(dto: {
    pedidoId: number; ordemServicoId?: number; itensProntos?: string; itensPendentes?: string; obs?: string;
  }, criadoPor?: string) {
    const { pedido, clienteNome, email } = await this.dadosPedido(dto.pedidoId);
    const partes: string[] = [`Olá ${clienteNome}, referente ao pedido ${pedido.numero}:`];
    if (dto.itensProntos) partes.push(`Disponível(is) para retirada: ${dto.itensProntos}.`);
    else partes.push('O material está pronto e disponível para retirada.');
    if (dto.itensPendentes) partes.push(`Pendente(s)/atraso: ${dto.itensPendentes}.`);
    if (dto.obs) partes.push(dto.obs);
    const mensagem = partes.join(' ');
    const assunto = `Histocell — pedido ${pedido.numero} pronto para retirada`;
    return this.registrar({
      pedidoId: pedido.id, ordemServicoId: dto.ordemServicoId, setor: 'expedicao', tipo: 'notificacao_pronto',
      assunto, mensagem, destinatario: email || undefined, criadoPor, notificar: !!email,
    });
  }

  // ── E8: histórico de comunicações de um pedido ────────────────────────────────
  historicoPedido(pedidoId: number) {
    return this.prisma.comunicacao.findMany({ where: { pedidoId }, orderBy: { createdAt: 'desc' } });
  }
}
