import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';

@Controller('pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PedidosController {
  constructor(private service: PedidosService) {}

  // ── Sub-rotas fixas antes de :id para evitar colisão ──────────────────────

  /** Lista serviços disponíveis para seleção nos itens do pedido */
  @Get('servicos')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  listarServicos() {
    return this.service.listarServicos();
  }

  /** Preço unitário para um cliente + serviço (TabelaPreco ou precoBase) */
  @Get('preco')
  @Roles('gerencia', 'recepcao', 'tecnico')
  getPreco(
    @Query('clienteId', ParseIntPipe) clienteId: number,
    @Query('servicoId', ParseIntPipe) servicoId: number,
  ) {
    return this.service.getPreco(clienteId, servicoId);
  }

  // ── CRUD principal ─────────────────────────────────────────────────────────

  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findAll(@Query() filter: FilterPedidoDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('gerencia', 'recepcao')
  create(@Body() dto: CreatePedidoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('gerencia', 'recepcao')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePedidoDto,
  ) {
    return this.service.update(id, dto);
  }

  /** Avança/retrocede o status do pedido */
  @Patch(':id/status')
  @Roles('gerencia', 'recepcao')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.service.updateStatus(id, status);
  }

  /** Exclui pedido (somente se status = rascunho) */
  @Delete(':id')
  @Roles('gerencia')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
