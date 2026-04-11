import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

const ETAPAS   = ['triagem', 'macroscopia', 'processamento', 'laudo'] as const;
const STATUS   = ['fila', 'em_andamento', 'concluida', 'cancelada']  as const;
const PRIORIDADES = ['normal', 'urgente'] as const;

export class FilterOrdemDto {
  @IsOptional()
  @IsString()
  busca?: string; // número OS, número amostra ou nome cliente

  @IsOptional()
  @IsString()
  @IsIn(STATUS)
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(ETAPAS)
  etapa?: string;

  @IsOptional()
  @IsString()
  @IsIn(PRIORIDADES)
  prioridade?: string;

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
