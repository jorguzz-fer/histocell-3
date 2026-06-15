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
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PacotesService } from './pacotes.service';
import { CreatePacoteDto } from './dto/create-pacote.dto';
import { UpdatePacoteDto } from './dto/update-pacote.dto';
import { ArquivarPacoteDto } from './dto/arquivar-pacote.dto';

@Controller('pacotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PacotesController {
  constructor(private service: PacotesService) {}

  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findAll(@Query('incluirInativos') incluirInativos?: string) {
    return this.service.findAll(incluirInativos === 'true');
  }

  @Get(':id')
  @Roles('gerencia', 'recepcao', 'tecnico', 'financeiro')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @Roles('gerencia', 'recepcao')
  create(@Body() dto: CreatePacoteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('gerencia', 'recepcao')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePacoteDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/arquivar')
  @Roles('gerencia', 'recepcao')
  arquivar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ArquivarPacoteDto,
  ) {
    return this.service.arquivar(id, dto.ativo);
  }

  @Delete(':id')
  @Roles('gerencia')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
