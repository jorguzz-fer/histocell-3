import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PacoteItemDto {
  @IsInt()
  servicoId: number;

  @IsInt()
  @Min(1)
  quantidade: number;

  @IsNumber()
  @Min(0)
  preco: number;
}

export class CreatePacoteDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PacoteItemDto)
  itens: PacoteItemDto[];
}
