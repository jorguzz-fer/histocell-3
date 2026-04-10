import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { QualidadeService } from './qualidade.service';

@Controller('qualidade')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QualidadeController {
  constructor(private service: QualidadeService) {}

  // TODO: Implementar endpoints
}
