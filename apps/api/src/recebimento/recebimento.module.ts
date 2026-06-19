import { Module } from '@nestjs/common';
import { RecebimentoController } from './recebimento.controller';
import { RecebimentoService } from './recebimento.service';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { EtiquetasModule } from '../etiquetas/etiquetas.module';

@Module({
  imports: [FinanceiroModule, EtiquetasModule],
  controllers: [RecebimentoController],
  providers: [RecebimentoService],
  exports: [RecebimentoService],
})
export class RecebimentoModule {}
