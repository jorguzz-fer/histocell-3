import { IsOptional, IsString, IsBooleanString } from 'class-validator';

export class FilterServicoDto {
  @IsOptional() @IsString() busca?: string;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsBooleanString() incluirInativos?: string;
}
