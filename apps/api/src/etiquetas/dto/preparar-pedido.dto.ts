import { IsInt } from 'class-validator';

/** Prepara a conferência de etiquetas de um pedido (cria uma amostra por item). */
export class PrepararPedidoDto {
  @IsInt()
  pedidoId: number;
}
