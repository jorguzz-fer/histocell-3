import { Module } from '@nestjs/common';
import { RecebimentoController } from './recebimento.controller';
import { RecebimentoService } from './recebimento.service';
import { AuditService } from '../common/audit.service';
import { OrdensModule } from '../ordens/ordens.module';

@Module({
  imports: [OrdensModule],
  controllers: [RecebimentoController],
  providers: [RecebimentoService, AuditService],
  exports: [RecebimentoService],
})
export class RecebimentoModule {}
