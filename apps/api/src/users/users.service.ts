import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const SELECT_USER = {
  id: true,
  nome: true,
  email: true,
  role: true,
  ativo: true,
  clienteId: true,
  primeiroAcesso: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Lista usada por selects (responsável etc.): apenas ativos, campos mínimos. */
  async list(roles?: string[]) {
    const where: any = { ativo: true };
    if (roles && roles.length) where.role = { in: roles };
    return this.prisma.user.findMany({
      where,
      select: { id: true, nome: true, email: true, role: true },
      orderBy: { nome: 'asc' },
    });
  }

  /** Lista completa para administração (todos, sem a senha). */
  async listAll(busca?: string) {
    const where: any = {};
    if (busca?.trim()) {
      where.OR = [
        { nome: { contains: busca.trim(), mode: 'insensitive' } },
        { email: { contains: busca.trim(), mode: 'insensitive' } },
      ];
    }
    const users = await this.prisma.user.findMany({
      where,
      select: SELECT_USER,
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    });
    // rótulo do papel (label) para exibição
    const papeis = await this.prisma.papel.findMany({ select: { nome: true, label: true } });
    const labelPorNome = new Map(papeis.map((p) => [p.nome, p.label]));
    return users.map((u) => ({ ...u, roleLabel: labelPorNome.get(u.role) ?? u.role }));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT_USER });
    if (!user) throw new NotFoundException(`Usuário #${id} não encontrado.`);
    return user;
  }

  private async validarPapel(role: string) {
    const papel = await this.prisma.papel.findUnique({ where: { nome: role } });
    if (!papel) throw new BadRequestException(`Papel "${role}" não existe.`);
    if (!papel.ativo) throw new BadRequestException(`Papel "${papel.label}" está inativo.`);
  }

  async create(dto: CreateUserDto, autorId: number) {
    await this.validarPapel(dto.role);
    const email = dto.email.trim().toLowerCase();
    const existe = await this.prisma.user.findUnique({ where: { email } });
    if (existe) throw new ConflictException(`Já existe usuário com o e-mail ${email}.`);

    const senha = await bcrypt.hash(dto.senha, 10);
    const user = await this.prisma.user.create({
      data: {
        nome: dto.nome.trim(),
        email,
        senha,
        role: dto.role,
        ativo: dto.ativo ?? true,
        primeiroAcesso: true,
      },
      select: SELECT_USER,
    });
    await this.audit.log(autorId, 'CREATE', 'User', user.id, { email, role: dto.role });
    return user;
  }

  async update(id: number, dto: UpdateUserDto, autorId: number) {
    const atual = await this.prisma.user.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException(`Usuário #${id} não encontrado.`);
    if (dto.role && dto.role !== atual.role) await this.validarPapel(dto.role);

    const data: any = {};
    if (dto.nome != null) data.nome = dto.nome.trim();
    if (dto.role != null) data.role = dto.role;
    if (dto.ativo != null) data.ativo = dto.ativo;
    if (dto.email != null) {
      const email = dto.email.trim().toLowerCase();
      if (email !== atual.email) {
        const existe = await this.prisma.user.findUnique({ where: { email } });
        if (existe) throw new ConflictException(`Já existe usuário com o e-mail ${email}.`);
        data.email = email;
      }
    }

    const user = await this.prisma.user.update({ where: { id }, data, select: SELECT_USER });
    await this.audit.log(autorId, 'UPDATE', 'User', id, data);
    return user;
  }

  async setAtivo(id: number, ativo: boolean, autorId: number) {
    const atual = await this.prisma.user.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException(`Usuário #${id} não encontrado.`);
    if (!ativo && id === autorId) {
      throw new BadRequestException('Você não pode desativar o próprio usuário.');
    }
    const user = await this.prisma.user.update({ where: { id }, data: { ativo }, select: SELECT_USER });
    await this.audit.log(autorId, ativo ? 'ATIVAR' : 'DESATIVAR', 'User', id);
    return user;
  }

  async resetSenha(id: number, novaSenha: string, autorId: number) {
    const atual = await this.prisma.user.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException(`Usuário #${id} não encontrado.`);
    const senha = await bcrypt.hash(novaSenha, 10);
    // primeiroAcesso=true → força a troca no próximo login.
    await this.prisma.user.update({ where: { id }, data: { senha, primeiroAcesso: true } });
    // revoga refresh tokens ativos por segurança
    await this.prisma.refreshToken.updateMany({ where: { userId: id, revoked: false }, data: { revoked: true } });
    await this.audit.log(autorId, 'RESET_SENHA', 'User', id);
    return { message: 'Senha redefinida. O usuário deverá trocá-la no próximo acesso.' };
  }

  async trocarPropriaSenha(userId: number, senhaAtual: string, novaSenha: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    const ok = await bcrypt.compare(senhaAtual, user.senha);
    if (!ok) throw new BadRequestException('Senha atual incorreta.');
    if (await bcrypt.compare(novaSenha, user.senha)) {
      throw new BadRequestException('A nova senha deve ser diferente da atual.');
    }
    const senha = await bcrypt.hash(novaSenha, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { senha, primeiroAcesso: false } });
    await this.audit.log(userId, 'TROCA_SENHA', 'User', userId);
    return { message: 'Senha alterada com sucesso.' };
  }

  /** Auditoria de um usuário (ações que ele executou). */
  async auditoria(id: number, limit = 50) {
    await this.findOne(id);
    return this.prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      select: {
        id: true, action: true, entity: true, entityId: true,
        details: true, createdAt: true,
      },
    });
  }
}
