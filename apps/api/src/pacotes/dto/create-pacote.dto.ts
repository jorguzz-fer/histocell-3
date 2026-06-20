import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  // Preço fixo do componente (modo 'fixo'). Opcional no modo 'desconto'.
  @IsNumber()
  @Min(0)
  @IsOptional()
  preco?: number;

  // % de desconto sobre a tabela do cliente (modo 'desconto').
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  descontoPct?: number;
}

export class CreatePacoteDto {
  // Opcional: quando vazio, o backend gera um código exclusivo PCT-NNN
  // (namespace próprio — nunca colide com código de serviço).
  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  // 'fixo' (preço fechado do combo) | 'desconto' (% sobre a tabela do cliente)
  @IsIn(['fixo', 'desconto'])
  @IsOptional()
  tipoPreco?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PacoteItemDto)
  itens: PacoteItemDto[];
}
