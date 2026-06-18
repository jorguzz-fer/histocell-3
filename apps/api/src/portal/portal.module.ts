import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PedidosModule } from '../pedidos/pedidos.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';

@Module({
  imports: [PedidosModule, FinanceiroModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
