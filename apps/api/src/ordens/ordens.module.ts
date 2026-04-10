import { Module } from '@nestjs/common';
import { OrdensController } from './ordens.controller';
import { OrdensService } from './ordens.service';

@Module({
  controllers: [OrdensController],
  providers: [OrdensService],
  exports: [OrdensService],
})
export class OrdensModule {}
