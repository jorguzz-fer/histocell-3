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
import { RecebimentoService } from './recebimento.service';
import { ReceberPedidoDto } from './dto/receber-pedido.dto';
import { UpdateAmostraDto } from './dto/update-amostra.dto';
import { FilterAmostraDto } from './dto/filter-amostra.dto';

@Controller('recebimento')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecebimentoController {
  constructor(private service: RecebimentoService) {}

  /** Fila de pedidos enviados aguardando recebimento */
  @Get('fila')
  @Roles('gerencia', 'recepcao', 'tecnico')
  findFila() {
    return this.service.findFila();
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
  receberPedido(@Body() dto: ReceberPedidoDto) {
    return this.service.receberPedido(dto);
  }

  /** Atualiza dados ou status de uma amostra */
  @Patch('amostras/:id')
  @Roles('gerencia', 'recepcao', 'tecnico')
  updateAmostra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAmostraDto,
  ) {
    return this.service.updateAmostra(id, dto);
  }
}
