import {
  IsInt,
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemPedidoDto {
  @IsInt()
  servicoId: number;

  @IsInt()
  @Min(1)
  quantidade: number;

  /** Valor unitário bruto (R$) */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preco: number;

  /** Percentual de desconto (0–100) */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  desconto?: number;
}

export class CreatePedidoDto {
  @IsInt()
  clienteId: number;

  @IsOptional()
  @IsString()
  observacoes?: string;

  /** Pedido urgente (prioridade) */
  @IsOptional()
  @IsBoolean()
  urgente?: boolean;

  /** Pagamento já adiantado (não cobrar no fechamento) */
  @IsOptional()
  @IsBoolean()
  pagamentoAdiantado?: boolean;

  /** Status inicial do pedido (rascunho ao salvar, enviado ao enviar) */
  @IsOptional()
  @IsIn(['rascunho', 'enviado'])
  status?: 'rascunho' | 'enviado';

  @ValidateNested({ each: true })
  @Type(() => CreateItemPedidoDto)
  @ArrayMinSize(1)
  itens: CreateItemPedidoDto[];
}
