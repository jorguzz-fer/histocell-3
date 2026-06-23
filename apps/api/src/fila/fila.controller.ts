import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { FilaService } from './fila.service';
import { FilterFilaDto } from './dto/filter-fila.dto';

@Controller('fila')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilaController {
  constructor(private service: FilaService) {}

  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico')
  getFila(@Query() filter: FilterFilaDto, @Request() req: any) {
    const soMeus = filter.soMeus === 'true';
    const userId = soMeus ? (req.user.sub ?? req.user.userId ?? req.user.id) : undefined;
    return this.service.getFila(userId);
  }
}
