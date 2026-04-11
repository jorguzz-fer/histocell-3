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
  HttpCode,
  Request,
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

  /** Cria um serviço customizado on-the-fly (quando o serviço não existe na lista) */
  @Post('servicos/novo')
  @HttpCode(201)
  @Roles('gerencia', 'recepcao')
  criarServico(@Body() body: {
    codigo: string
    categoria: string
    nome: string
    precoBase: number
    precoRotina: number
    precoPesquisa: number
  }) {
    return this.service.criarServico(body);
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

  /** Opções de cascata para seleção guiada */
  @Get('servicos/cascade')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  getCascadeOptions(
    @Query('categoria') categoria?: string,
    @Query('tipo') tipo?: string,
    @Query('v1') v1?: string,
    @Query('v2') v2?: string,
    @Query('v3') v3?: string,
    @Query('v4') v4?: string,
  ) {
    return this.service.getCascadeOptions({ categoria, tipo, v1, v2, v3, v4 });
  }

  /** Serviços mais usados (top 10) */
  @Get('servicos/populares')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  getPopulares() {
    return this.service.getPopulares();
  }

  /** Favoritos do usuário autenticado */
  @Get('servicos/favoritos')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  getFavoritos(@Request() req: any) {
    return this.service.getFavoritos(req.user.sub ?? req.user.userId ?? req.user.id);
  }

  /** Toggle favorito de um serviço */
  @Post('servicos/:id/favorito')
  @HttpCode(200)
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  toggleFavorito(
    @Param('id', ParseIntPipe) servicoId: number,
    @Request() req: any,
  ) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.toggleFavorito(userId, servicoId);
  }

  /** Histórico de serviços de um cliente */
  @Get('clientes/:clienteId/historico-servicos')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  getHistoricoCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.service.getHistoricoCliente(clienteId);
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
