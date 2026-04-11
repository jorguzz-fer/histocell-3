import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterClienteDto {
  /** Busca por nome ou nomeFantasia (LIKE parcial, case-insensitive) */
  @IsString()
  @IsOptional()
  busca?: string;

  @IsEnum(['PJ', 'PF'])
  @IsOptional()
  tipo?: 'PJ' | 'PF';

  @IsEnum(['recorrente', 'esporadico', 'pesquisador'])
  @IsOptional()
  segmento?: 'recorrente' | 'esporadico' | 'pesquisador';

  /** Filtrar por ativo (padrão: só ativos) */
  @Transform(({ value }) => {
    if (value === 'false') return false;
    if (value === 'true') return true;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  page?: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number;
}
