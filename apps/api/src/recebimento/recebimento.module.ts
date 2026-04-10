import { Module } from '@nestjs/common';
import { RecebimentoController } from './recebimento.controller';
import { RecebimentoService } from './recebimento.service';

@Module({
  controllers: [RecebimentoController],
  providers: [RecebimentoService],
  exports: [RecebimentoService],
})
export class RecebimentoModule {}
