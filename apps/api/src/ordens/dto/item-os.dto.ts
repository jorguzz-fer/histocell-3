import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Serviço que a OS vai executar de fato (decidido na conferência do material). */
export class AddItemOSDto {
  @IsInt()
  servicoId: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantidade?: number;

  /** Omitido = usa o preço da tabela do cliente (ou o preço base do serviço). */
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  preco?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  desconto?: number;

  @IsString()
  @IsOptional()
  observacoes?: string;
}
