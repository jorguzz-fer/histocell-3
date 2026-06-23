import { IsIn, IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator';

/** Lança um crédito (entrada) ou débito (consumo) no saldo pré-pago do cliente. */
export class LancarCreditoDto {
  @IsInt()
  clienteId: number;

  @IsString()
  @IsIn(['credito', 'debito'])
  tipo: 'credito' | 'debito';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor: number;

  @IsString()
  @MinLength(2)
  descricao: string;
}
