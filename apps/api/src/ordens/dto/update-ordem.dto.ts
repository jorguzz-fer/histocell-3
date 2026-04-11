import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateOrdemDto {
  @IsOptional()
  @IsString()
  responsavel?: string;

  @IsOptional()
  @IsString()
  @IsIn(['normal', 'urgente'])
  prioridade?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
