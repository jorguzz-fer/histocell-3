import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(roles?: string[]) {
    const where: any = { ativo: true };
    if (roles && roles.length) where.role = { in: roles };
    return this.prisma.user.findMany({
      where,
      select: { id: true, nome: true, email: true, role: true },
      orderBy: { nome: 'asc' },
    });
  }
}
