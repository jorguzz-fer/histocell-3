import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Area } from '../auth/roles.guard';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ResetSenhaDto,
  TrocarSenhaDto,
} from './dto/user.dto';

function autorId(req: any): number {
  return req.user?.id ?? req.user?.sub ?? req.user?.userId;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Area('usuarios')
export class UsersController {
  constructor(private service: UsersService) {}

  /** Lista usuários ativos para selects (responsável etc.). */
  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico')
  list(@Query('roles') rolesCsv?: string) {
    const roles = rolesCsv?.split(',').map((r) => r.trim()).filter(Boolean);
    return this.service.list(roles);
  }

  /** Lista completa (administração). */
  @Get('admin')
  @Roles('gerencia')
  listAll(@Query('busca') busca?: string) {
    return this.service.listAll(busca);
  }

  /** Troca a própria senha (qualquer usuário autenticado). */
  @Post('trocar-senha')
  trocarSenha(@Body() dto: TrocarSenhaDto, @Request() req: any) {
    return this.service.trocarPropriaSenha(autorId(req), dto.senhaAtual, dto.novaSenha);
  }

  @Get(':id')
  @Roles('gerencia')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/auditoria')
  @Roles('gerencia')
  auditoria(@Param('id', ParseIntPipe) id: number, @Query('limit') limit?: string) {
    return this.service.auditoria(id, limit ? Number(limit) : 50);
  }

  @Post()
  @Roles('gerencia')
  create(@Body() dto: CreateUserDto, @Request() req: any) {
    return this.service.create(dto, autorId(req));
  }

  @Patch(':id')
  @Roles('gerencia')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @Request() req: any) {
    return this.service.update(id, dto, autorId(req));
  }

  @Patch(':id/ativo')
  @Roles('gerencia')
  setAtivo(
    @Param('id', ParseIntPipe) id: number,
    @Body('ativo') ativo: boolean,
    @Request() req: any,
  ) {
    return this.service.setAtivo(id, ativo, autorId(req));
  }

  @Post(':id/reset-senha')
  @Roles('gerencia')
  resetSenha(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetSenhaDto,
    @Request() req: any,
  ) {
    return this.service.resetSenha(id, dto.novaSenha, autorId(req));
  }
}
