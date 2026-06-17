import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { DEPARTAMENTO_KEYS, STATUS_RASTREIO } from '../departamentos';

export class FilterRastreioDto {
  /** Busca: código, identificação, nº interno da amostra ou cliente. */
  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @IsString()
  @IsIn(DEPARTAMENTO_KEYS)
  departamento?: string;

  @IsOptional()
  @IsString()
  @IsIn(STATUS_RASTREIO as unknown as string[])
  status?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number;
}
