import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
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

  /** Extrato de crédito pré-pago do cliente (saldo + movimentos) */
  @Get(':token/extrato')
  extrato(@Param('token') token: string) {
    return this.service.extrato(token);
  }

  /** Cria o pedido do cliente (origem=web). status: 'enviado' | 'rascunho' */
  @Post(':token/pedido')
  criarPedido(@Param('token') token: string, @Body() dto: PortalPedidoDto) {
    return this.service.criarPedido(token, dto);
  }

  /** Reabre um rascunho do cliente (itens para editar) */
  @Get(':token/pedido/:numero')
  carregarRascunho(@Param('token') token: string, @Param('numero') numero: string) {
    return this.service.carregarRascunho(token, numero);
  }

  /** Atualiza um rascunho e, opcionalmente, envia (status='enviado') */
  @Patch(':token/pedido/:numero')
  atualizarRascunho(
    @Param('token') token: string,
    @Param('numero') numero: string,
    @Body() dto: PortalPedidoDto,
  ) {
    return this.service.atualizarRascunho(token, numero, dto);
  }

  /** Exclui um rascunho do cliente */
  @Delete(':token/pedido/:numero')
  excluirRascunho(@Param('token') token: string, @Param('numero') numero: string) {
    return this.service.excluirRascunho(token, numero);
  }
}
