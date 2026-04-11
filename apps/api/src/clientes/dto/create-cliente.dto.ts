import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEnderecoDto {
  @IsEnum(['entrega', 'cobranca', 'sede'])
  tipo: 'entrega' | 'cobranca' | 'sede';

  @IsString()
  @IsNotEmpty()
  logradouro: string;

  @IsString()
  @IsNotEmpty()
  numero: string;

  @IsString()
  @IsOptional()
  complemento?: string;

  @IsString()
  @IsNotEmpty()
  bairro: string;

  @IsString()
  @IsNotEmpty()
  cidade: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  uf: string;

  @IsString()
  @MinLength(8)
  @MaxLength(9)
  cep: string;
}

export class CreateClienteDto {
  @IsEnum(['PJ', 'PF'])
  tipo: 'PJ' | 'PF';

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nome: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nomeFantasia?: string;

  /** CPF (11 dígitos) ou CNPJ (14 dígitos) — só dígitos */
  @IsString()
  @IsNotEmpty()
  documento: string;

  @IsString()
  @IsOptional()
  inscricaoEstadual?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  idEtiqueta?: string;

  @IsEmail()
  email: string;

  @IsEmail()
  @IsOptional()
  emailFinanceiro?: string;

  @IsEmail()
  @IsOptional()
  emailMacroscopia?: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsString()
  @IsOptional()
  celular?: string;

  @IsEnum(['recorrente', 'esporadico', 'pesquisador'])
  @IsOptional()
  segmento?: 'recorrente' | 'esporadico' | 'pesquisador';

  @IsString()
  @IsOptional()
  observacoes?: string;

  /** Endereço principal (opcional no create, mas recomendado) */
  @ValidateNested()
  @Type(() => CreateEnderecoDto)
  @IsOptional()
  endereco?: CreateEnderecoDto;
}
