import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PortalPedidoDto } from './dto/portal-pedido.dto';

/**
 * Portal público do cliente — acesso por token (sem login/JWT).
 * O token é resolvido para o cliente no servidor; os preços do pedido
 * são SEMPRE recalculados no backend (não confiamos no que vem do navegador).
 */
@Controller('portal')
export class PortalController {
  constructor(private service: PortalService) {}

  /** Dados do portal: cliente + saldo */
  @Get(':token')
  info(@Param('token') token: string) {
    return this.service.info(token);
  }

  /** Catálogo (serviços/pacotes/populares/histórico) com preços do cliente */
  @Get(':token/catalogo')
  catalogo(@Param('token') token: string) {
    return this.service.catalogo(token);
  }

  /** Últimos pedidos do cliente */
  @Get(':token/pedidos')
  pedidos(@Param('token') token: string) {
    return this.service.listarPedidos(token);
  }

  /** Cria o pedido do cliente (origem=web) */
  @Post(':token/pedido')
  criarPedido(@Param('token') token: string, @Body() dto: PortalPedidoDto) {
    return this.service.criarPedido(token, dto);
  }
}
