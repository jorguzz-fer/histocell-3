import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [PedidosController],
  providers: [PedidosService, AuditService],
  exports: [PedidosService],
})
export class PedidosModule {}
