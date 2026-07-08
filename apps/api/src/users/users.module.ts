import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PapeisController } from './papeis.controller';
import { PapeisService } from './papeis.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [UsersController, PapeisController],
  providers: [UsersService, PapeisService, AuditService],
  exports: [UsersService, PapeisService],
})
export class UsersModule {}
