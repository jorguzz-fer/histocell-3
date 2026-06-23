import { Module } from '@nestjs/common';
import { RecebimentoController } from './recebimento.controller';
import { RecebimentoService } from './recebimento.service';
import { AuditService } from '../common/audit.service';
import { OrdensModule } from '../ordens/ordens.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { EtiquetasModule } from '../etiquetas/etiquetas.module';

@Module({
  imports: [OrdensModule, FinanceiroModule, EtiquetasModule],
  controllers: [RecebimentoController],
  providers: [RecebimentoService, AuditService],
  exports: [RecebimentoService],
})
export class RecebimentoModule {}
