import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { FinanceiroService } from './financeiro.service';
import { LancarCreditoDto } from './dto/lancar-credito.dto';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceiroController {
  constructor(private service: FinanceiroService) {}

  /** Lança crédito/débito no saldo pré-pago de um cliente */
  @Post('creditos')
  @Roles('gerencia', 'financeiro')
  lancarCredito(@Body() dto: LancarCreditoDto) {
    return this.service.lancarCredito(dto);
  }

  /** Saldo atual por cliente (resumo) */
  @Get('creditos/resumo')
  @Roles('gerencia', 'financeiro')
  resumoCreditos() {
    return this.service.resumoCreditos();
  }

  /** Saldo de um cliente (leve — recepção pode ver para informar no pedido) */
  @Get('creditos/:clienteId/saldo')
  @Roles('gerencia', 'financeiro', 'recepcao')
  saldoCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.service.saldoCliente(clienteId);
  }

  /** Extrato (movimentos + saldo) de um cliente */
  @Get('creditos/:clienteId')
  @Roles('gerencia', 'financeiro')
  extrato(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.service.extrato(clienteId);
  }
}
