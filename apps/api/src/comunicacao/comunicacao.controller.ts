import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Area } from '../auth/roles.guard';
import { ComunicacaoService } from './comunicacao.service';

@Controller('comunicacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@Area('qualidade')
export class ComunicacaoController {
  constructor(private service: ComunicacaoService) {}

  // Motivos
  @Get('motivos')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  listarMotivos(@Query('setor') setor?: string, @Query('incluirInativos') inc?: string) {
    return this.service.listarMotivos(setor, inc === 'true');
  }

  @Post('motivos')
  @Roles('gerencia')
  criarMotivo(@Body() body: { setor: string; titulo: string; mensagemTemplate: string; notificaCliente?: boolean }) {
    return this.service.criarMotivo(body);
  }

  @Patch('motivos/:id')
  @Roles('gerencia')
  atualizarMotivo(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.atualizarMotivo(id, body);
  }

  @Delete('motivos/:id')
  @Roles('gerencia')
  removerMotivo(@Param('id', ParseIntPipe) id: number) {
    return this.service.removerMotivo(id);
  }

  // Ocorrência (E3)
  @Post('ocorrencia')
  @Roles('gerencia', 'recepcao', 'tecnico')
  ocorrencia(@Body() body: any, @Request() req: any) {
    return this.service.registrarOcorrencia(body, req.user?.nome ?? req.user?.email);
  }

  // Notificar pronto / retirada (E4)
  @Post('notificar-pronto')
  @Roles('gerencia', 'recepcao', 'tecnico')
  notificarPronto(@Body() body: any, @Request() req: any) {
    return this.service.notificarPronto(body, req.user?.nome ?? req.user?.email);
  }

  // Histórico (E8)
  @Get('pedido/:id')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  historico(@Param('id', ParseIntPipe) id: number) {
    return this.service.historicoPedido(id);
  }
}
