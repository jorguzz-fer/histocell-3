import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { EtiquetasService } from './etiquetas.service';

@Controller('etiquetas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EtiquetasController {
  constructor(private service: EtiquetasService) {}

  // TODO: Implementar endpoints
}
