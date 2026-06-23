import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private service: UsersService) {}

  /** Lista usuários ativos, filtrando por roles (CSV) opcional */
  @Get()
  @Roles('gerencia', 'recepcao', 'tecnico')
  list(@Query('roles') rolesCsv?: string) {
    const roles = rolesCsv?.split(',').map((r) => r.trim()).filter(Boolean);
    return this.service.list(roles);
  }
}
