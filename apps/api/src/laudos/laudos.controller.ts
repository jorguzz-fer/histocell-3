import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Area } from '../auth/roles.guard';
import { LaudosService } from './laudos.service';

@Controller('laudos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Area('laudos')
export class LaudosController {
  constructor(private service: LaudosService) {}

  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico')
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  /** Solicita laudo para um pedido (patologista por e-mail) */
  @Post()
  @Roles('gerencia', 'recepcao', 'tecnico')
  solicitar(
    @Body() body: { pedidoId: number; patologistaNome?: string; patologistaEmail: string },
    @Request() req: any,
  ) {
    const nome = req.user?.nome ?? req.user?.email;
    return this.service.solicitar({ ...body, solicitadoPor: nome });
  }

  /** Anexa o PDF do patologista e libera ao cliente */
  @Patch(':id/liberar')
  @Roles('gerencia', 'recepcao', 'tecnico')
  liberar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { arquivoBase64: string; arquivoNome?: string; assinadoPor?: string },
  ) {
    return this.service.liberar(id, body);
  }

  /** Download do PDF do laudo */
  @Get(':id/arquivo')
  @Roles('gerencia', 'recepcao', 'tecnico')
  arquivo(@Param('id', ParseIntPipe) id: number) {
    return this.service.arquivo(id);
  }

  @Delete(':id')
  @Roles('gerencia')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
