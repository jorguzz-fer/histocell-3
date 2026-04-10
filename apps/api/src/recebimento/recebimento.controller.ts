import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RecebimentoService } from './recebimento.service';

@Controller('recebimento')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecebimentoController {
  constructor(private service: RecebimentoService) {}

  // TODO: Implementar endpoints
}
