import { IsString, MinLength } from 'class-validator';

export class CriarTipoRecipienteDto {
  @IsString()
  @MinLength(2)
  nome: string;
}
