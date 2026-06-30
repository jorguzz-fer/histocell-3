import { Module } from '@nestjs/common';
import { LaudosController } from './laudos.controller';
import { LaudosService } from './laudos.service';

@Module({
  controllers: [LaudosController],
  providers: [LaudosService],
  exports: [LaudosService],
})
export class LaudosModule {}
