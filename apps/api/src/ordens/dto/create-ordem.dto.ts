import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateOrdemDto {
  @IsInt()
  amostraId: number;

  @IsOptional()
  @IsString()
  @IsIn(['normal', 'urgente'])
  prioridade?: string;

  @IsOptional()
  @IsString()
  responsavel?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
