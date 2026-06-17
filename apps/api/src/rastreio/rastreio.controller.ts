import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RastreioService } from './rastreio.service';
import { ScanDto } from './dto/scan.dto';
import { FilterRastreioDto } from './dto/filter-rastreio.dto';

@Controller('rastreio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RastreioController {
  constructor(private service: RastreioService) {}

  /** Lista de departamentos do fluxo */
  @Get('departamentos')
  @Roles('gerencia', 'recepcao', 'tecnico')
  departamentos() {
    return this.service.departamentos();
  }

  /** Resumo: quantas etiquetas estão em cada departamento */
  @Get('resumo')
  @Roles('gerencia', 'recepcao', 'tecnico')
  resumo() {
    return this.service.resumo();
  }

  /** Lista paginada de etiquetas com filtros de rastreio */
  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico')
  findAll(@Query() filter: FilterRastreioDto) {
    return this.service.findAll(filter);
  }

  /** Timeline de uma etiqueta (por código de barras) */
  @Get('timeline')
  @Roles('gerencia', 'recepcao', 'tecnico')
  timeline(@Query('codigo') codigo: string) {
    return this.service.timeline(codigo);
  }

  /** Registra um scan (entrada/saída) num departamento */
  @Post('scan')
  @Roles('gerencia', 'recepcao', 'tecnico')
  scan(@Body() dto: ScanDto) {
    return this.service.scan(dto);
  }
}
