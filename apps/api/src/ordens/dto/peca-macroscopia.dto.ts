import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Uma peça descrita na macroscopia, que vira cassetes ao concluir a etapa. */
export class AddPecaMacroscopiaDto {
  @IsString()
  descricao: string;

  @IsOptional()
  @IsInt()
  recipienteId?: number;

  @IsOptional()
  @IsString()
  paciente?: string;

  @IsOptional()
  @IsString()
  medidas?: string;

  @IsOptional()
  @IsString()
  caracteristicas?: string;

  @IsOptional()
  @IsString()
  cor?: string;

  @IsOptional()
  @IsString()
  consistencia?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  numeroCassetes: number;

  @IsOptional()
  @IsInt()
  servicoId?: number;
}
