import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { CreatePedidoDto } from './create-pedido.dto';

const STATUS_VALIDOS = ['rascunho', 'enviado', 'recebido', 'cancelado'] as const;

export class UpdatePedidoDto extends PartialType(CreatePedidoDto) {
  @IsOptional()
  @IsString()
  @IsIn(STATUS_VALIDOS)
  status?: string;
}
