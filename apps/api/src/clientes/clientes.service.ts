import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  // TODO: Implementar CRUD completo
}
