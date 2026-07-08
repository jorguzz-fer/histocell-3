import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;

  /** Slug do papel (Papel.nome). */
  @IsString()
  role: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class ResetSenhaDto {
  @IsString()
  @MinLength(8)
  novaSenha: string;
}

export class TrocarSenhaDto {
  @IsString()
  senhaAtual: string;

  @IsString()
  @MinLength(8)
  novaSenha: string;
}
