import { IsBoolean } from 'class-validator';

export class ArquivarServicoDto {
  @IsBoolean() ativo: boolean;
}
