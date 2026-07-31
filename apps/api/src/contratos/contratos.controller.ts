import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ContratosService } from './contratos.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';

@Controller('contratos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContratosController {
  constructor(private service: ContratosService) {}

  @Get()
  @Roles('gerencia', 'financeiro')
  findAll(@Query('ativos') ativos?: string) {
    return this.service.findAll(ativos === 'true');
  }

  /** Contratos ativos vencendo dentro de N dias (aviso no painel) */
  @Get('vencendo')
  @Roles('gerencia', 'financeiro')
  vencendo(@Query('dias') dias?: string) {
    const n = dias ? parseInt(dias, 10) : 30;
    return this.service.vencendo(Number.isFinite(n) ? n : 30);
  }

  @Get(':id')
  @Roles('gerencia', 'financeiro')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** Dispara agora o alerta de renovação por e-mail (gerência) — teste/forçar */
  @Post('alertas/rodar')
  @Roles('gerencia')
  rodarAlertas() {
    return this.service.rodarAlertas(true);
  }

  /** Gera agora as mensalidades devidas (boleto Cora) — teste/forçar */
  @Post('mensalidades/rodar')
  @Roles('gerencia')
  rodarMensalidades() {
    return this.service.rodarMensalidades(true);
  }

  @Post()
  @Roles('gerencia', 'financeiro')
  create(@Body() dto: CreateContratoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('gerencia', 'financeiro')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContratoDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/renovar')
  @Roles('gerencia', 'financeiro')
  renovar(@Param('id', ParseIntPipe) id: number) {
    return this.service.renovar(id);
  }

  @Patch(':id/cancelar')
  @Roles('gerencia', 'financeiro')
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancelar(id);
  }
}
