import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { FinanceiroService } from './financeiro.service';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceiroController {
  constructor(private service: FinanceiroService) {}

  // TODO: Implementar endpoints
}
