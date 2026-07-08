import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { CHAVES_PERMISSAO, PAPEL_SUPERADMIN } from './permissoes.catalog';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /** Permissões efetivas de um papel (superadmin = todas). */
  async permissoesDoPapel(role: string): Promise<string[]> {
    if (role === PAPEL_SUPERADMIN) return [...CHAVES_PERMISSAO];
    const perms = await this.prisma.papelPermissao.findMany({
      where: { papel: { nome: role, ativo: true } },
      select: { chave: true },
    });
    return perms.map((p) => p.chave);
  }

  async login(email: string, senha: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    const permissoes = await this.permissoesDoPapel(user.role);
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        primeiroAcesso: user.primeiroAcesso,
        permissoes,
      },
    };
  }

  async validateUser(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId, ativo: true },
      select: { id: true, nome: true, email: true, role: true, clienteId: true },
    });
  }
}
