import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: number,
    action: string,
    entity: string,
    entityId?: number,
    details?: any,
    ip?: string,
    userAgent?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ip,
        userAgent,
      },
    });
  }
}
