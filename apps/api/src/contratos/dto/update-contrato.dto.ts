import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateContratoDto } from './create-contrato.dto';

export class UpdateContratoDto extends PartialType(CreateContratoDto) {
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
