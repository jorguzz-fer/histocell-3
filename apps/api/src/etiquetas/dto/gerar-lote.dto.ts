import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIPOS = ['cassete', 'lamina', 'bloco'] as const;

/** Uma linha de geração (uma amostra → N etiquetas). */
export class LinhaLoteDto {
  @IsInt()
  amostraId: number;

  @IsString()
  @IsIn(TIPOS)
  tipo: (typeof TIPOS)[number];

  @IsInt()
  @Min(0)
  @Max(200)
  quantidade: number;

  @IsOptional()
  @IsString()
  coloracao?: string;

  @IsOptional()
  @IsString()
  identificacao?: string;
}

/** Gera etiquetas para várias amostras de uma vez (conferência do pedido). */
export class GerarLoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinhaLoteDto)
  @ArrayMinSize(1)
  linhas: LinhaLoteDto[];
}
