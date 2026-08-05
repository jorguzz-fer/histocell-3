import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Area } from '../auth/roles.guard';
import { RecebimentoService } from './recebimento.service';
import { ReceberPedidoDto } from './dto/receber-pedido.dto';
import { EntradaRecepcaoDto } from './dto/entrada-recepcao.dto';
import {
  EntradaAvulsaDto,
  FilterEntradaDto,
  VincularEntradaDto,
} from './dto/entrada-avulsa.dto';
import { CriarTipoRecipienteDto } from './dto/tipo-recipiente.dto';
import { UpdateAmostraDto } from './dto/update-amostra.dto';
import { FilterAmostraDto } from './dto/filter-amostra.dto';

@Controller('recebimento')
@UseGuards(JwtAuthGuard, RolesGuard)
@Area('recebimento')
export class RecebimentoController {
  constructor(private service: RecebimentoService) {}

  /** Etapa 1 — Recepção: pedidos enviados aguardando entrada */
  @Get('recepcao')
  @Roles('gerencia', 'recepcao', 'tecnico')
  filaRecepcao() {
    return this.service.filaRecepcao();
  }

  /** Etapa 2 — Laboratório: pedidos com entrada feita, aguardando identificação */
  @Get('laboratorio')
  @Roles('gerencia', 'recepcao', 'tecnico')
  filaLaboratorio() {
    return this.service.filaLaboratorio();
  }

  /** Tipos de recipiente (Pote, Caixa, Saco, Outro, …) */
  @Get('tipos-recipiente')
  @Roles('gerencia', 'recepcao', 'tecnico')
  tiposRecipiente() {
    return this.service.tiposRecipiente();
  }

  @Post('tipos-recipiente')
  @Roles('gerencia', 'recepcao')
  criarTipoRecipiente(@Body() dto: CriarTipoRecipienteDto) {
    return this.service.criarTipoRecipiente(dto.nome);
  }

  /** Etapa 1 — registra a entrada (recipientes) e envia ao laboratório */
  @Post('entrada')
  @Roles('gerencia', 'recepcao')
  registrarEntrada(@Body() dto: EntradaRecepcaoDto) {
    return this.service.registrarEntrada(dto);
  }

  // ── Tela "Entrada": cliente + objeto que chegou, sem orçamento ainda ─────────

  /** Registra a entrada avulsa e devolve os ids dos volumes (p/ imprimir) */
  @Post('entrada-avulsa')
  @Roles('gerencia', 'recepcao')
  registrarEntradaAvulsa(@Body() dto: EntradaAvulsaDto) {
    return this.service.registrarEntradaAvulsa(dto);
  }

  /** Entradas avulsas: `?pendentes=true` (sem pedido) ou `?dias=N` (recentes) */
  @Get('entradas')
  @Roles('gerencia', 'recepcao', 'tecnico')
  entradasAvulsas(@Query() filter: FilterEntradaDto) {
    return this.service.entradasAvulsas(filter);
  }

  /** Dados das etiquetas de entrada p/ impressão: `?ids=1,2,3` */
  @Get('entradas/etiquetas')
  @Roles('gerencia', 'recepcao', 'tecnico')
  etiquetasEntrada(@Query('ids') ids?: string) {
    const lista = (ids ?? '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n));
    return this.service.etiquetasEntrada(lista);
  }

  /** Vincula volumes de entrada a um pedido/orçamento do mesmo cliente */
  @Post('entradas/vincular')
  @Roles('gerencia', 'recepcao')
  vincularEntrada(@Body() dto: VincularEntradaDto) {
    return this.service.vincularEntrada(dto);
  }

  /** Fila (compat) — mesma da recepção */
  @Get('fila')
  @Roles('gerencia', 'recepcao', 'tecnico')
  findFila() {
    return this.service.findFila();
  }

  /** Detalhe do pedido p/ impressão: etiquetas de recipiente + Ordem de Serviço */
  @Get('pedido/:id/detalhe')
  @Roles('gerencia', 'recepcao', 'tecnico')
  detalhePedido(@Param('id', ParseIntPipe) id: number) {
    return this.service.detalhePedido(id);
  }

  /** Lista paginada de amostras com filtros */
  @Get('amostras')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findAllAmostras(@Query() filter: FilterAmostraDto) {
    return this.service.findAllAmostras(filter);
  }

  /** Detalhe de uma amostra */
  @Get('amostras/:id')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findOneAmostra(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneAmostra(id);
  }

  /** Recebe um pedido: registra amostras e avança status para "recebido" */
  @Post('receber')
  @Roles('gerencia', 'recepcao')
  receberPedido(@Body() dto: ReceberPedidoDto, @Request() req: any) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.receberPedido(dto, userId);
  }

  /** Atualiza dados ou status de uma amostra */
  @Patch('amostras/:id')
  @Roles('gerencia', 'recepcao', 'tecnico')
  updateAmostra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAmostraDto,
    @Request() req: any,
  ) {
    return this.service.updateAmostra(id, dto, req.user?.role);
  }

  /** Reclassifica o recipiente na macroscopia (ex.: "Pote" → "Cassete") */
  @Patch('recipiente/:id')
  @Roles('gerencia', 'recepcao', 'tecnico')
  atualizarRecipiente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { tipo?: string; observacoes?: string },
    @Request() req: any,
  ) {
    return this.service.atualizarRecipiente(id, dto, req.user?.role);
  }
}
