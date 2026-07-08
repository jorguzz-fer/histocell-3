import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePapelDto {
  @IsString()
  @MinLength(2)
  label: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  /** Chaves de permissão (áreas do catálogo). */
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissoes: string[];
}

export class UpdatePapelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissoes?: string[];
}
