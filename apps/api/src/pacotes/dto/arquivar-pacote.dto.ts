import { IsBoolean } from 'class-validator';

export class ArquivarPacoteDto {
  @IsBoolean()
  ativo: boolean;
}
