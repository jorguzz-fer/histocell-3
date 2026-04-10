import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class RecebimentoService {
  constructor(private prisma: PrismaService) {}

  // TODO: Implementar CRUD completo
}
