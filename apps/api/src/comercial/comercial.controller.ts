import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ComercialService } from './comercial.service';

@Controller('comercial')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComercialController {
  constructor(private service: ComercialService) {}

  // TODO: Implementar endpoints
}
