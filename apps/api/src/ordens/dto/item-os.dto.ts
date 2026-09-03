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

  /** Condição a que o serviço se aplica: seco | molhado | macroscopia. */
  @IsString()
  @IsOptional()
  condicao?: string;

  /**
   * Libera o lançamento mesmo com o quadrado da condição já fechado (todas as
   * unidades esperadas já lançadas). Só a gerência, com justificativa — o
   * princípio é "guiar sem travar": o padrão avisa, não impede à força.
   */
  @IsOptional()
  forcar?: boolean;

  @IsString()
  @IsOptional()
  justificativa?: string;
}
