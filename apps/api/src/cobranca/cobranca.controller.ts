import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CobrancaService } from './cobranca.service';

@Controller('cobranca')
export class CobrancaController {
  constructor(private service: CobrancaService) {}

  /** Webhook PÚBLICO da Cora (sem JWT) — notificação de boleto pago etc. */
  @Post('webhook/cora')
  webhook(@Body() body: any) {
    return this.service.webhook(body);
  }

  // ── Rotas autenticadas ──────────────────────────────────────────────────────
  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gerencia', 'financeiro')
  status() {
    return this.service.configurada();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gerencia', 'financeiro')
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  /** Gera a cobrança do mês (cria fatura + emite boleto na Cora) */
  @Post('gerar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gerencia', 'financeiro')
  gerar(@Body() body: { clienteId: number; periodo: string }) {
    return this.service.gerarCobrancaMes(body.clienteId, body.periodo);
  }

  /** (Re)emite o boleto de uma fatura existente */
  @Post(':id/emitir')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gerencia', 'financeiro')
  emitir(@Param('id', ParseIntPipe) id: number) {
    return this.service.emitirBoleto(id);
  }

  /** Sincroniza o status da fatura com a Cora */
  @Post(':id/sincronizar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gerencia', 'financeiro')
  sincronizar(@Param('id', ParseIntPipe) id: number) {
    return this.service.sincronizar(id);
  }
}
