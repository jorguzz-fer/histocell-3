import {
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AmostraItemDto {
  @IsOptional()
  @IsString()
  numeroCliente?: string;

  @IsString()
  especie: string; // canino, felino, bovino, equino, suíno, humano, outro

  @IsString()
  material: string; // biopsia, citologia, peca_cirurgica, necropsia, outro

  @IsOptional()
  @IsString()
  localizacao?: string; // região anatômica

  @IsOptional()
  @IsString()
  observacoes?: string;
}

/** Recebe um pedido inteiro: registra N amostras e avança pedido para "recebido" */
export class ReceberPedidoDto {
  @IsInt()
  pedidoId: number;

  @IsOptional()
  @IsString()
  recebidoPor?: string;

  @ValidateNested({ each: true })
  @Type(() => AmostraItemDto)
  @ArrayMinSize(1)
  amostras: AmostraItemDto[];
}
