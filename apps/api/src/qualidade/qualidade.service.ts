import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class QualidadeService {
  constructor(private prisma: PrismaService) {}

  // TODO: Implementar CRUD completo
}
