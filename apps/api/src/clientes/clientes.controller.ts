import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { FilterClienteDto } from './dto/filter-cliente.dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(private service: ClientesService) {}

  /**
   * GET /clientes
   * Lista clientes com filtros opcionais: ?busca=&tipo=&segmento=&ativo=&page=&limit=
   * Roles: todos os usuários internos
   */
  @Get()
  findAll(@Query() filter: FilterClienteDto) {
    return this.service.findAll(filter);
  }

  /**
   * GET /clientes/:id
   * Detalhe de um cliente (com endereços)
   * Roles: todos os usuários internos
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /**
   * POST /clientes
   * Cria novo cliente (+ endereço principal opcional)
   * Roles: gerencia, recepcao
   */
  @Post()
  @Roles('gerencia', 'recepcao')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateClienteDto) {
    return this.service.create(dto);
  }

  /**
   * PATCH /clientes/:id
   * Atualiza cliente (campos parciais)
   * Roles: gerencia, recepcao
   */
  @Patch(':id')
  @Roles('gerencia', 'recepcao')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /clientes/:id
   * Soft-delete (desativa) — nunca remove do banco
   * Roles: gerencia apenas
   */
  @Delete(':id')
  @Roles('gerencia')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  /**
   * PATCH /clientes/:id/reativar
   * Reativa um cliente desativado
   * Roles: gerencia apenas
   */
  @Patch(':id/reativar')
  @Roles('gerencia')
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.service.reativar(id);
  }
}
