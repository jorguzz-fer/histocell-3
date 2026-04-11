import { IsOptional, IsString, IsIn } from 'class-validator';

const STATUS_AMOSTRA = ['pendente', 'em_processamento', 'concluida', 'rejeitada'] as const;

export class UpdateAmostraDto {
  @IsOptional()
  @IsString()
  numeroCliente?: string;

  @IsOptional()
  @IsString()
  especie?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  localizacao?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  @IsIn(STATUS_AMOSTRA)
  status?: string;

  @IsOptional()
  @IsString()
  recebidoPor?: string;
}
