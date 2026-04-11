import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { CryptoService } from '../common/crypto.service';

@Module({
  controllers: [ClientesController],
  providers: [ClientesService, CryptoService],
  exports: [ClientesService],
})
export class ClientesModule {}
