import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { RecebimentoModule } from './recebimento/recebimento.module';
import { OrdensModule } from './ordens/ordens.module';
import { EtiquetasModule } from './etiquetas/etiquetas.module';
import { QualidadeModule } from './qualidade/qualidade.module';
import { ComercialModule } from './comercial/comercial.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    AuthModule,
    ClientesModule,
    PedidosModule,
    RecebimentoModule,
    OrdensModule,
    EtiquetasModule,
    QualidadeModule,
    ComercialModule,
    FinanceiroModule,
    RelatoriosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
