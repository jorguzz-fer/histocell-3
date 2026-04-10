import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { OrdensService } from './ordens.service';

@Controller('ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdensController {
  constructor(private service: OrdensService) {}

  // TODO: Implementar endpoints
}
