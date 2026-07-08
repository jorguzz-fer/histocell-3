import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service';
import { PAPEL_SUPERADMIN } from './permissoes.catalog';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Área/módulo do controller (chave do catálogo de permissões). Usada para
// liberar acesso a papéis CUSTOM via matriz de permissões, sem alterar o
// comportamento dos papéis do sistema (que continuam passando por @Roles).
export const AREA_KEY = 'area';
export const Area = (chave: string) => SetMetadata(AREA_KEY, chave);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // REGRA DE OURO: Busca role REAL no banco
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !dbUser.ativo) return false;

    // Gerência = superadmin: acesso total.
    if (dbUser.role === PAPEL_SUPERADMIN) return true;

    // Papel do sistema listado em @Roles → comportamento idêntico ao atual.
    if (requiredRoles.includes(dbUser.role)) return true;

    // Papel CUSTOM: libera apenas endpoints de módulo (acessíveis a algum papel
    // não-gerência) e desde que o papel tenha a permissão da área do controller.
    // Endpoints exclusivos de gerência (@Roles('gerencia') apenas) nunca liberam.
    const area = this.reflector.getAllAndOverride<string>(AREA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const endpointDeModulo = requiredRoles.some((r) => r !== PAPEL_SUPERADMIN);
    if (area && endpointDeModulo) {
      const tem = await this.prisma.papelPermissao.findFirst({
        where: { chave: area, papel: { nome: dbUser.role, ativo: true } },
        select: { id: true },
      });
      if (tem) return true;
    }

    return false;
  }
}
