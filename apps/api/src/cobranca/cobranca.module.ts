import { Module } from '@nestjs/common';
import { CobrancaController } from './cobranca.controller';
import { CobrancaService } from './cobranca.service';
import { CoraClient } from './cora.client';
import { CryptoService } from '../common/crypto.service';

@Module({
  controllers: [CobrancaController],
  providers: [CobrancaService, CoraClient, CryptoService],
  exports: [CobrancaService],
})
export class CobrancaModule {}
