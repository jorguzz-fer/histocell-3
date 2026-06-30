import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const INCLUDE = {
  pedido: {
    select: {
      numero: true,
      cliente: { select: { id: true, nome: true, nomeFantasia: true } },
    },
  },
} as const;

// não devolve o base64 do PDF nas listagens (pesado) — só metadados
const SELECT_LISTA = {
  id: true,
  pedidoId: true,
  patologistaNome: true,
  patologistaEmail: true,
  arquivoNome: true,
  status: true,
  solicitadoPor: true,
  solicitadoEm: true,
  liberado: true,
  liberadoEm: true,
  createdAt: true,
  pedido: INCLUDE.pedido,
} as const;

@Injectable()
export class LaudosService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    return this.prisma.laudo.findMany({
      where: status ? { status } : {},
      select: SELECT_LISTA,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Solicita um laudo para um pedido, informando o patologista (envio por e-mail). */
  async solicitar(dto: {
    pedidoId: number;
    patologistaNome?: string;
    patologistaEmail: string;
    solicitadoPor?: string;
  }) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      select: { id: true },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${dto.pedidoId} não encontrado.`);

    const laudo = await this.prisma.laudo.create({
      data: {
        pedidoId: dto.pedidoId,
        patologistaNome: dto.patologistaNome,
        patologistaEmail: dto.patologistaEmail,
        status: 'solicitado',
        solicitadoPor: dto.solicitadoPor,
        solicitadoEm: new Date(),
      },
      select: SELECT_LISTA,
    });
    return laudo;
  }

  /** Anexa o PDF devolvido pelo patologista e libera o laudo ao cliente. */
  async liberar(id: number, dto: { arquivoBase64: string; arquivoNome?: string; assinadoPor?: string }) {
    const laudo = await this.prisma.laudo.findUnique({ where: { id }, select: { id: true } });
    if (!laudo) throw new NotFoundException(`Laudo #${id} não encontrado.`);
    if (!dto.arquivoBase64?.trim()) throw new BadRequestException('Anexe o PDF do laudo.');

    const atualizado = await this.prisma.laudo.update({
      where: { id },
      data: {
        arquivoBase64: dto.arquivoBase64,
        arquivoNome: dto.arquivoNome ?? 'laudo.pdf',
        assinadoPor: dto.assinadoPor,
        assinadoEm: new Date(),
        status: 'liberado',
        liberado: true,
        liberadoEm: new Date(),
      },
      select: SELECT_LISTA,
    });
    return atualizado;
  }

  /** Conteúdo do PDF (base64) para download. */
  async arquivo(id: number) {
    const laudo = await this.prisma.laudo.findUnique({
      where: { id },
      select: { arquivoBase64: true, arquivoNome: true, liberado: true },
    });
    if (!laudo || !laudo.arquivoBase64) throw new NotFoundException('Laudo sem arquivo.');
    return laudo;
  }

  async remove(id: number) {
    const laudo = await this.prisma.laudo.findUnique({ where: { id }, select: { id: true } });
    if (!laudo) throw new NotFoundException(`Laudo #${id} não encontrado.`);
    await this.prisma.laudo.delete({ where: { id } });
    return { id, deleted: true };
  }
}
