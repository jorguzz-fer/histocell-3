import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecipienteItemDto {
  @IsString()
  tipo: string;

  @IsInt()
  @Min(1)
  quantidade: number;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

/** Etapa 1 (Recepção): registra os recipientes que chegaram, sem contar amostras. */
export class EntradaRecepcaoDto {
  @IsInt()
  pedidoId: number;

  @IsOptional()
  @IsString()
  recebidoPor?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipienteItemDto)
  @ArrayMinSize(1)
  recipientes: RecipienteItemDto[];
}
