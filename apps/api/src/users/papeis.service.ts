import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import {
  PERMISSOES,
  CHAVES_PERMISSAO,
  PAPEIS_SISTEMA,
  PAPEL_SUPERADMIN,
} from '../auth/permissoes.catalog';
import { CreatePapelDto, UpdatePapelDto } from './dto/papel.dto';

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

@Injectable()
export class PapeisService implements OnModuleInit {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Garante que os papéis do sistema existam (idempotente). Só semeia as
   *  permissões quando o papel é criado — não sobrescreve edições posteriores. */
  async onModuleInit() {
    try {
      for (const p of PAPEIS_SISTEMA) {
        const existente = await this.prisma.papel.findUnique({ where: { nome: p.nome } });
        if (existente) {
          // mantém sistema=true e label atualizado; não mexe nas permissões
          if (!existente.sistema) {
            await this.prisma.papel.update({ where: { id: existente.id }, data: { sistema: true } });
          }
          continue;
        }
        const criado = await this.prisma.papel.create({
          data: { nome: p.nome, label: p.label, descricao: p.descricao, sistema: true, ativo: true },
        });
        await this.prisma.papelPermissao.createMany({
          data: p.permissoes.map((chave) => ({ papelId: criado.id, chave })),
          skipDuplicates: true,
        });
      }
    } catch (e: any) {
      // Não derruba o boot se a tabela ainda não existir (migração pendente).
      console.error('[Papeis] seed falhou:', e?.message ?? e);
    }
  }

  catalogo() {
    return PERMISSOES;
  }

  async list() {
    const papeis = await this.prisma.papel.findMany({
      orderBy: [{ sistema: 'desc' }, { label: 'asc' }],
      include: { permissoes: { select: { chave: true } } },
    });
    // contagem de usuários por papel
    const grupos = await this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
    const usuariosPorPapel = new Map(grupos.map((g) => [g.role, g._count._all]));
    return papeis.map((p) => ({
      id: p.id,
      nome: p.nome,
      label: p.label,
      descricao: p.descricao,
      sistema: p.sistema,
      ativo: p.ativo,
      superadmin: p.nome === PAPEL_SUPERADMIN,
      permissoes: p.permissoes.map((x) => x.chave),
      usuarios: usuariosPorPapel.get(p.nome) ?? 0,
    }));
  }

  async findOne(id: number) {
    const p = await this.prisma.papel.findUnique({
      where: { id },
      include: { permissoes: { select: { chave: true } } },
    });
    if (!p) throw new NotFoundException(`Papel #${id} não encontrado.`);
    return { ...p, permissoes: p.permissoes.map((x) => x.chave) };
  }

  private validarChaves(chaves: string[]) {
    const invalidas = chaves.filter((c) => !CHAVES_PERMISSAO.includes(c));
    if (invalidas.length) {
      throw new BadRequestException(`Permissões inválidas: ${invalidas.join(', ')}.`);
    }
  }

  async create(dto: CreatePapelDto, autorId: number) {
    this.validarChaves(dto.permissoes);
    let nome = slugify(dto.label);
    if (!nome) throw new BadRequestException('Nome de papel inválido.');
    // evita colidir com papéis existentes (inclui os do sistema)
    const base = nome;
    let i = 1;
    while (await this.prisma.papel.findUnique({ where: { nome } })) {
      nome = `${base}_${i++}`;
    }
    const papel = await this.prisma.papel.create({
      data: {
        nome,
        label: dto.label.trim(),
        descricao: dto.descricao?.trim() || null,
        sistema: false,
        permissoes: { create: dto.permissoes.map((chave) => ({ chave })) },
      },
      include: { permissoes: { select: { chave: true } } },
    });
    await this.audit.log(autorId, 'CREATE', 'Papel', papel.id, { nome, permissoes: dto.permissoes });
    return { ...papel, permissoes: papel.permissoes.map((x) => x.chave) };
  }

  async update(id: number, dto: UpdatePapelDto, autorId: number) {
    const papel = await this.prisma.papel.findUnique({ where: { id } });
    if (!papel) throw new NotFoundException(`Papel #${id} não encontrado.`);

    const data: any = {};
    if (dto.label != null) data.label = dto.label.trim();
    if (dto.descricao !== undefined) data.descricao = dto.descricao?.trim() || null;
    if (dto.ativo != null) {
      if (papel.sistema && !dto.ativo) {
        throw new BadRequestException('Papéis do sistema não podem ser desativados.');
      }
      data.ativo = dto.ativo;
    }

    if (Object.keys(data).length) {
      await this.prisma.papel.update({ where: { id }, data });
    }

    // Permissões: editáveis apenas em papéis customizados. Papéis do sistema têm
    // acesso fixo (built-in) e a matriz deles é somente leitura.
    if (dto.permissoes) {
      if (papel.sistema) {
        throw new BadRequestException('As permissões dos papéis do sistema não podem ser alteradas.');
      }
      this.validarChaves(dto.permissoes);
      await this.prisma.$transaction([
        this.prisma.papelPermissao.deleteMany({ where: { papelId: id } }),
        this.prisma.papelPermissao.createMany({
          data: dto.permissoes.map((chave) => ({ papelId: id, chave })),
          skipDuplicates: true,
        }),
      ]);
    }

    await this.audit.log(autorId, 'UPDATE', 'Papel', id, { ...data, permissoes: dto.permissoes });
    return this.findOne(id);
  }

  async remove(id: number, autorId: number) {
    const papel = await this.prisma.papel.findUnique({ where: { id } });
    if (!papel) throw new NotFoundException(`Papel #${id} não encontrado.`);
    if (papel.sistema) throw new BadRequestException('Papéis do sistema não podem ser excluídos.');
    const emUso = await this.prisma.user.count({ where: { role: papel.nome } });
    if (emUso > 0) {
      throw new ConflictException(
        `Papel em uso por ${emUso} usuário(s). Reatribua-os antes de excluir.`,
      );
    }
    await this.prisma.papel.delete({ where: { id } });
    await this.audit.log(autorId, 'DELETE', 'Papel', id, { nome: papel.nome });
    return { message: `Papel "${papel.label}" excluído.` };
  }
}
