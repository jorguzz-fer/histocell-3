import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { EtiquetasService } from './etiquetas.service';
import { GerarEtiquetasDto } from './dto/gerar-etiquetas.dto';
import { FilterEtiquetaDto } from './dto/filter-etiqueta.dto';
import { ImprimirEtiquetasDto } from './dto/imprimir-etiquetas.dto';
import { PrepararPedidoDto } from './dto/preparar-pedido.dto';
import { GerarLoteDto } from './dto/gerar-lote.dto';

@Controller('etiquetas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EtiquetasController {
  constructor(private service: EtiquetasService) {}

  /** Lista paginada de etiquetas com filtros */
  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico')
  findAll(@Query() filter: FilterEtiquetaDto) {
    return this.service.findAll(filter);
  }

  /** Amostras com contagem de etiquetas (seletor de geração) */
  @Get('amostras')
  @Roles('gerencia', 'recepcao', 'tecnico')
  listarAmostras(@Query('busca') busca?: string) {
    return this.service.listarAmostras(busca);
  }

  /** Etiquetas de uma amostra específica */
  @Get('amostra/:id')
  @Roles('gerencia', 'recepcao', 'tecnico')
  findByAmostra(@Param('id', ParseIntPipe) id: number) {
    return this.service.findByAmostra(id);
  }

  /** Gera N etiquetas para uma amostra */
  @Post('gerar')
  @Roles('gerencia', 'recepcao', 'tecnico')
  gerar(@Body() dto: GerarEtiquetasDto) {
    return this.service.gerar(dto);
  }

  /** Prepara a conferência de etiquetas de um pedido (cria amostras por item) */
  @Post('preparar-pedido')
  @Roles('gerencia', 'recepcao', 'tecnico')
  prepararPedido(@Body() dto: PrepararPedidoDto) {
    return this.service.prepararPedido(dto.pedidoId);
  }

  /** Gera etiquetas para várias amostras de uma vez (conferência do pedido) */
  @Post('gerar-lote')
  @Roles('gerencia', 'recepcao', 'tecnico')
  gerarLote(@Body() dto: GerarLoteDto) {
    return this.service.gerarLote(dto);
  }

  /** Marca um lote de etiquetas como impressas */
  @Post('imprimir')
  @Roles('gerencia', 'recepcao', 'tecnico')
  imprimir(@Body() dto: ImprimirEtiquetasDto) {
    return this.service.imprimir(dto.ids);
  }

  /** Remove uma etiqueta */
  @Delete(':id')
  @Roles('gerencia', 'recepcao')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.remover(id);
  }
}
