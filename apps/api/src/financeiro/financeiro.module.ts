import { Module } from '@nestjs/common';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';
import { ConsumoService } from '../common/consumo.service';

@Module({
  controllers: [FinanceiroController],
  providers: [FinanceiroService, ConsumoService],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
