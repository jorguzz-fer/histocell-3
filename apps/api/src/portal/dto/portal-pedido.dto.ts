import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PortalItemDto {
  @IsInt()
  servicoId: number;

  @IsInt()
  @Min(1)
  quantidade: number;
}

/** Pedido criado pelo cliente no portal (preços recalculados no servidor). */
export class PortalPedidoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortalItemDto)
  @ArrayMinSize(1)
  itens: PortalItemDto[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  // 'enviado' (envia ao laboratório) | 'rascunho' (salva para concluir depois)
  @IsOptional()
  @IsIn(['enviado', 'rascunho'])
  status?: 'enviado' | 'rascunho';
}
