import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateContratoDto {
  @IsInt()
  clienteId: number;

  @IsNumber()
  @Min(0)
  valorMensal: number;

  @IsDateString()
  dataInicio: string;

  @IsInt()
  @Min(1)
  duracaoMeses: number;

  @IsInt()
  @Min(1)
  @Max(28)
  diaCobranca: number;

  @IsString()
  @IsOptional()
  observacoes?: string;
}
