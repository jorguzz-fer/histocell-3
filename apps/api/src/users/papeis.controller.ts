import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Area } from '../auth/roles.guard';
import { PapeisService } from './papeis.service';
import { CreatePapelDto, UpdatePapelDto } from './dto/papel.dto';

function autorId(req: any): number {
  return req.user?.id ?? req.user?.sub ?? req.user?.userId;
}

@Controller('papeis')
@UseGuards(JwtAuthGuard, RolesGuard)
@Area('usuarios')
export class PapeisController {
  constructor(private service: PapeisService) {}

  /** Catálogo de áreas/permissões disponíveis (para a matriz). */
  @Get('catalogo')
  @Roles('gerencia')
  catalogo() {
    return this.service.catalogo();
  }

  @Get()
  @Roles('gerencia')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @Roles('gerencia')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('gerencia')
  create(@Body() dto: CreatePapelDto, @Request() req: any) {
    return this.service.create(dto, autorId(req));
  }

  @Patch(':id')
  @Roles('gerencia')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePapelDto, @Request() req: any) {
    return this.service.update(id, dto, autorId(req));
  }

  @Delete(':id')
  @Roles('gerencia')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, autorId(req));
  }
}
