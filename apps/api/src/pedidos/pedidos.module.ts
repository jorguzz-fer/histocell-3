import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { AuditService } from '../common/audit.service';
import { OrdensModule } from '../ordens/ordens.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';

@Module({
  imports: [OrdensModule, FinanceiroModule],
  controllers: [PedidosController],
  providers: [PedidosService, AuditService],
  exports: [PedidosService],
})
export class PedidosModule {}
