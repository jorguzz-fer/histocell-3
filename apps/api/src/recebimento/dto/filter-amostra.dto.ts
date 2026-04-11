import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

const STATUS_AMOSTRA = ['pendente', 'em_processamento', 'concluida', 'rejeitada'] as const;

export class FilterAmostraDto {
  /** Busca: número interno, número cliente ou nome do cliente */
  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @IsString()
  @IsIn(STATUS_AMOSTRA)
  status?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  pedidoId?: number;

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
