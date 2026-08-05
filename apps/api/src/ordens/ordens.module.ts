import { Module } from '@nestjs/common';
import { OrdensController } from './ordens.controller';
import { OrdensService } from './ordens.service';
import { AuditService } from '../common/audit.service';
import { PrecoService } from '../common/preco.service';

@Module({
  controllers: [OrdensController],
  providers: [OrdensService, AuditService, PrecoService],
  exports: [OrdensService],
})
export class OrdensModule {}
