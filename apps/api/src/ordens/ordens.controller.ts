import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Area } from '../auth/roles.guard';
import { OrdensService } from './ordens.service';
import { CreateOrdemDto } from './dto/create-ordem.dto';
import { UpdateOrdemDto } from './dto/update-ordem.dto';
import { FilterOrdemDto } from './dto/filter-ordem.dto';
import { AddItemOSDto } from './dto/item-os.dto';
import { EtiquetasService } from '../etiquetas/etiquetas.service';

@Controller('ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
@Area('ordens')
export class OrdensController {
  constructor(
    private service: OrdensService,
    private etiquetas: EtiquetasService,
  ) {}

  /** Amostras recebidas que ainda não possuem OS */
  @Get('pendentes')
  @Roles('gerencia', 'recepcao', 'tecnico')
  findPendentes() {
    return this.service.findPendentes();
  }

  /** Relatório de pendências: OS com conferência fina incompleta */
  @Get('pendencias')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  pendencias() {
    return this.service.pendencias();
  }

  /** Gera etiquetas de cassete direto na OS, uma por identificação informada */
  @Post(':id/etiquetas')
  @Roles('gerencia', 'recepcao', 'tecnico')
  gerarEtiquetas(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { identificacoes: string[]; tipo?: string; itemOrdemServicoId?: number },
  ) {
    return this.etiquetas.gerarParaOS(id, body);
  }

  /** Status da conferência fina de uma OS */
  @Get(':id/conferencia')
  @Roles('gerencia', 'recepcao', 'tecnico')
  conferencia(@Param('id', ParseIntPipe) id: number) {
    return this.service.statusConferencia(id);
  }

  /** Bipa uma etiqueta na conferência fina */
  @Post(':id/conferir')
  @Roles('gerencia', 'recepcao', 'tecnico')
  conferir(@Param('id', ParseIntPipe) id: number, @Body('codigo') codigo: string, @Request() req: any) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.service.conferir(id, codigo, userId);
  }

  /** Libera a conferência incompleta com justificativa */
  @Post(':id/conferencia/liberar')
  @Roles('gerencia', 'tecnico')
  liberarConferencia(@Param('id', ParseIntPipe) id: number, @Body('obs') obs: string, @Request() req: any) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.service.liberarConferencia(id, obs, userId);
  }

  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findAll(@Query() filter: FilterOrdemDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('gerencia', 'recepcao', 'tecnico')
  create(@Body() dto: CreateOrdemDto, @Request() req: any) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @Roles('gerencia', 'recepcao', 'tecnico')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdemDto,
  ) {
    return this.service.update(id, dto);
  }

  /** Avança a etapa atual (triagem → macroscopia → processamento → laudo → concluída) */
  @Patch(':id/avancar')
  @Roles('gerencia', 'tecnico')
  avancar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.avancar(id, userId);
  }

  /** Move a OS para um departamento (desvio/terminal); terminal conclui a OS */
  @Patch(':id/mover')
  @Roles('gerencia', 'tecnico')
  mover(
    @Param('id', ParseIntPipe) id: number,
    @Body('etapa') etapa: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.moverPara(id, etapa, userId);
  }

  /** Cancela a OS e reverte a amostra para pendente */
  @Patch(':id/cancelar')
  @Roles('gerencia')
  cancelar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId = req.user.sub ?? req.user.userId ?? req.user.id;
    return this.service.cancelar(id, userId);
  }

  // ── Serviços que a OS vai executar ──────────────────────────────────────────
  // O orçamento é estimativa; esta lista é o que a equipe confirmou ao conferir
  // o material.

  @Get(':id/itens')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  listarItens(@Param('id', ParseIntPipe) id: number) {
    return this.service.listarItens(id);
  }

  @Post(':id/itens')
  @Roles('gerencia', 'recepcao', 'tecnico')
  adicionarItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddItemOSDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.service.adicionarItem(id, dto, userId);
  }

  @Delete('itens/:itemId')
  @Roles('gerencia', 'recepcao', 'tecnico')
  removerItem(@Param('itemId', ParseIntPipe) itemId: number, @Request() req: any) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.service.removerItem(itemId, userId);
  }
}
