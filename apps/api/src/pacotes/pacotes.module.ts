import { Module } from '@nestjs/common';
import { PacotesController } from './pacotes.controller';
import { PacotesService } from './pacotes.service';

@Module({
  controllers: [PacotesController],
  providers: [PacotesService],
  exports: [PacotesService],
})
export class PacotesModule {}
