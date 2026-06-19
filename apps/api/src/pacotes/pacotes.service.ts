import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreatePacoteDto } from './dto/create-pacote.dto';
import { UpdatePacoteDto } from './dto/update-pacote.dto';

const INCLUDE_ITENS = {
  itens: {
    include: {
      servico: { select: { id: true, codigo: true, nome: true, categoria: true } },
    },
    orderBy: { id: 'asc' as const },
  },
} as const;

@Injectable()
export class PacotesService {
  constructor(private prisma: PrismaService) {}

  private toShape(pacote: any) {
    const itens = (pacote.itens ?? []).map((it: any) => ({
      ...it,
      preco: Number(it.preco),
      subtotal: Math.round(Number(it.preco) * it.quantidade * 100) / 100,
    }));
    const precoTotal = itens.reduce((sum: number, it: any) => sum + it.subtotal, 0);
    // categorias do pacote = união das categorias dos serviços componentes
    // (ex.: um pacote corte+coloração aparece nas duas categorias)
    const categorias = Array.from(
      new Set(itens.map((it: any) => it.servico?.categoria).filter(Boolean)),
    ).sort() as string[];
    return {
      ...pacote,
      itens,
      precoTotal: Math.round(precoTotal * 100) / 100,
      totalItens: itens.length,
      categorias,
    };
  }

  async findAll(incluirInativos = false) {
    const pacotes = await this.prisma.pacote.findMany({
      where: incluirInativos ? {} : { ativo: true },
      include: INCLUDE_ITENS,
      orderBy: { nome: 'asc' },
    });
    return pacotes.map((p) => this.toShape(p));
  }

  async findOne(id: number) {
    const pacote = await this.prisma.pacote.findUnique({
      where: { id },
      include: INCLUDE_ITENS,
    });
    if (!pacote) throw new NotFoundException(`Pacote #${id} não encontrado.`);
    return this.toShape(pacote);
  }

  // Próximo código no namespace exclusivo PCT-NNN (nunca colide com serviço).
  private async gerarCodigo(): Promise<string> {
    const pacotes = await this.prisma.pacote.findMany({ select: { codigo: true } });
    let max = 0;
    for (const p of pacotes) {
      const m = /^PCT-(\d+)$/i.exec(p.codigo.trim());
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
    return `PCT-${String(max + 1).padStart(3, '0')}`;
  }

  async create(dto: CreatePacoteDto) {
    const codigo = dto.codigo?.trim() || (await this.gerarCodigo());
    const dup = await this.prisma.pacote.findUnique({ where: { codigo } });
    if (dup) throw new ConflictException('Já existe um pacote com esse código');

    const pacote = await this.prisma.pacote.create({
      data: {
        codigo,
        nome: dto.nome,
        descricao: dto.descricao,
        itens: {
          create: dto.itens.map((it) => ({
            servicoId: it.servicoId,
            quantidade: it.quantidade,
            preco: it.preco,
          })),
        },
      },
      include: INCLUDE_ITENS,
    });
    return this.toShape(pacote);
  }

  async update(id: number, dto: UpdatePacoteDto) {
    const atual = await this.prisma.pacote.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException(`Pacote #${id} não encontrado.`);

    if (dto.codigo && dto.codigo !== atual.codigo) {
      const dup = await this.prisma.pacote.findUnique({ where: { codigo: dto.codigo } });
      if (dup) throw new ConflictException('Já existe um pacote com esse código');
    }

    const { itens, ...fields } = dto;
    const data: any = { ...fields };
    // Substitui a lista de itens por completo, quando enviada
    if (itens) {
      data.itens = {
        deleteMany: {},
        create: itens.map((it) => ({
          servicoId: it.servicoId,
          quantidade: it.quantidade,
          preco: it.preco,
        })),
      };
    }

    const pacote = await this.prisma.pacote.update({
      where: { id },
      data,
      include: INCLUDE_ITENS,
    });
    return this.toShape(pacote);
  }

  async arquivar(id: number, ativo: boolean) {
    const atual = await this.prisma.pacote.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException(`Pacote #${id} não encontrado.`);
    const pacote = await this.prisma.pacote.update({ where: { id }, data: { ativo } });
    return { id: pacote.id, ativo: pacote.ativo };
  }

  async remove(id: number) {
    const atual = await this.prisma.pacote.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException(`Pacote #${id} não encontrado.`);
    // PacoteItem tem onDelete: Cascade — pacotes não são referenciados por pedidos
    await this.prisma.pacote.delete({ where: { id } });
    return { id, deleted: true };
  }
}
