import { Module } from '@nestjs/common';
import { RastreioController } from './rastreio.controller';
import { RastreioService } from './rastreio.service';

@Module({
  controllers: [RastreioController],
  providers: [RastreioService],
  exports: [RastreioService],
})
export class RastreioModule {}
