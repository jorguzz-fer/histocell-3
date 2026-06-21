import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RelatoriosController {
  constructor(private service: RelatoriosService) {}

  /** Tempos do processo por pedido (criado → recepção → laboratório → processado → despachado) */
  @Get('tempos')
  @Roles('gerencia', 'financeiro')
  tempos(@Query('inicio') inicio?: string, @Query('fim') fim?: string) {
    return this.service.tempos(inicio, fim);
  }
}
