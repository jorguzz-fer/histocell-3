import { IsOptional, IsString, IsNumber, IsBoolean, Min } from 'class-validator';

export class UpdateServicoDto {
  @IsOptional() @IsBoolean() geraEtiqueta?: boolean;
  @IsOptional() @IsNumber() @Min(0) prazoDias?: number;
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsString() codigo?: string;
  @IsOptional() @IsNumber() @Min(0) precoRotina?: number;
  @IsOptional() @IsNumber() @Min(0) precoPesquisa?: number;
  @IsOptional() @IsString() observacoes?: string;
  @IsOptional() @IsString() variante1?: string;
  @IsOptional() @IsString() variante2?: string;
  @IsOptional() @IsString() variante3?: string;
  @IsOptional() @IsString() variante4?: string;
  @IsOptional() @IsString() variante5?: string;
}
