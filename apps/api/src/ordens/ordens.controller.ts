import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { OrdensService } from './ordens.service';
import { CreateOrdemDto } from './dto/create-ordem.dto';
import { UpdateOrdemDto } from './dto/update-ordem.dto';
import { FilterOrdemDto } from './dto/filter-ordem.dto';

@Controller('ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdensController {
  constructor(private service: OrdensService) {}

  /** Amostras recebidas que ainda não possuem OS */
  @Get('pendentes')
  @Roles('gerencia', 'recepcao', 'tecnico')
  findPendentes() {
    return this.service.findPendentes();
  }

  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findAll(@Query() filter: FilterOrdemDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('gerencia', 'recepcao', 'tecnico')
  create(@Body() dto: CreateOrdemDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('gerencia', 'recepcao', 'tecnico')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdemDto,
  ) {
    return this.service.update(id, dto);
  }

  /** Avança a etapa atual (triagem → macroscopia → processamento → laudo → concluída) */
  @Patch(':id/avancar')
  @Roles('gerencia', 'tecnico')
  avancar(@Param('id', ParseIntPipe) id: number) {
    return this.service.avancar(id);
  }

  /** Cancela a OS e reverte a amostra para pendente */
  @Patch(':id/cancelar')
  @Roles('gerencia')
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancelar(id);
  }
}
