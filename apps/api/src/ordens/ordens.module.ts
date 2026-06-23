import { Module } from '@nestjs/common';
import { OrdensController } from './ordens.controller';
import { OrdensService } from './ordens.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [OrdensController],
  providers: [OrdensService, AuditService],
  exports: [OrdensService],
})
export class OrdensModule {}
