import { IsOptional, IsString, IsInt, Min, IsBooleanString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterEtiquetaDto {
  /** Busca: nº da etiqueta, código, identificação, nº interno ou cliente. */
  @IsOptional()
  @IsString()
  busca?: string;

  /** "true" | "false" — filtra por impresso. */
  @IsOptional()
  @IsBooleanString()
  impresso?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  amostraId?: number;

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
