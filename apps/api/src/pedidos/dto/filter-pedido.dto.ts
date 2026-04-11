import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

const STATUS_VALIDOS = ['rascunho', 'enviado', 'recebido', 'cancelado'] as const;

export class FilterPedidoDto {
  /** Busca livre: número do pedido ou nome/apelido do cliente */
  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @IsString()
  @IsIn(STATUS_VALIDOS)
  status?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  clienteId?: number;

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
